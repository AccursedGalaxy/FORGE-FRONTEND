import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import Anthropic from "@anthropic-ai/sdk";
import { db, getSettingValue } from "../db/index.ts";
import { cards } from "../db/schema.ts";
import { eq, max, and } from "drizzle-orm";
import { broadcast } from "../routes/events.ts";
import { emit } from "../hooks/index.ts";
import type { Card } from "../types.ts";

const anthropic = new Anthropic();

// ── Active session registry ───────────────────────────────────────────────────

export const activeSessions = new Map<string, ChildProcess>();
export const activePlanSessions = new Map<string, ChildProcess>();

function killAllSessions() {
  for (const [cardId, proc] of activeSessions) {
    console.log(`[claude] killing session for card ${cardId} on shutdown`);
    proc.kill("SIGTERM");
  }
  activeSessions.clear();
  for (const [cardId, proc] of activePlanSessions) {
    console.log(`[claude] killing plan session for card ${cardId} on shutdown`);
    proc.kill("SIGTERM");
  }
  activePlanSessions.clear();
}

process.on("SIGTERM", killAllSessions);
process.on("SIGINT",  killAllSessions);
process.on("exit",    killAllSessions);

// ── Inline card formatter (avoids circular dep with routes/cards.ts) ─────────

function fmtCard(row: typeof cards.$inferSelect): Card {
  return {
    id: row.id,
    title: row.title,
    priority: (row.priority ?? "medium") as "high" | "medium" | "low",
    assignee: row.assignee ?? "",
    tags: JSON.parse(row.tags ?? "[]") as string[],
    due: row.due ?? "",
    description: row.description ?? "",
    claudeSessionId: row.claudeSessionId ?? null,
    claudeStatus: row.claudeStatus ?? null,
    claudeNotes: row.claudeNotes ?? "",
    planSessionId: row.planSessionId ?? null,
    planStatus: row.planStatus ?? null,
    planContent: row.planContent ?? "",
  };
}

// ── Session summarizer ────────────────────────────────────────────────────────

async function summarizeSession(
  cardTitle: string,
  rawOutput: string,
  toolCounts: Map<string, number>,
): Promise<string> {
  const toolSummary = toolCounts.size > 0
    ? Array.from(toolCounts.entries())
        .map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
        .join(", ")
    : "none";

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `You are writing a concise completion note for a task card in a project management tool.

Task: "${cardTitle}"
Tools used: ${toolSummary}

Claude's output (raw stream):
${rawOutput.slice(0, 6000)}

Write a brief, clear completion note (2-5 sentences max) that summarises:
- What was actually done/changed
- Any notable decisions or findings
- The outcome

Be specific and concrete. No filler phrases like "I have successfully" or "Claude has". Write in past tense. Plain text only, no markdown headers.`,
      }],
    });

    const text = msg.content.find(b => b.type === "text")?.text ?? "";
    return text.trim();
  } catch (err) {
    console.error("[claude] summarize error:", err);
    return "";
  }
}

// ── Shared session handler ────────────────────────────────────────────────────

function runSession(
  cardId: string,
  project: { id: string; projectPath: string },
  args: string[],
  existingDescription: string,
  cardTitle: string,
) {
  const binPath = getSettingValue("claude_bin_path", "claude");
  const cwd = project.projectPath || undefined;

  // Unset CLAUDECODE so claude doesn't refuse to start inside a parent Claude session
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k !== "CLAUDECODE")
  ) as NodeJS.ProcessEnv;

  console.log(`[claude] spawning for card ${cardId} cwd=${cwd ?? process.cwd()}`);
  const proc = spawn(binPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  activeSessions.set(cardId, proc);

  proc.on("spawn", () => {
    console.log(`[claude] process spawned successfully (pid=${proc.pid}) for card ${cardId}`);
  });

  proc.on("error", (err) => {
    console.error(`[claude] failed to spawn for card ${cardId}:`, err.message);
    activeSessions.delete(cardId);
    db.update(cards).set({ claudeStatus: "error", updatedAt: Date.now() }).where(eq(cards.id, cardId));
    broadcast("claude:error", { cardId, projectId: project.id, error: err.message });
  });

  // chunks = everything shown in the live panel
  // textChunks = only the final text responses (saved to notes)
  // toolCounts = tool name → call count (for notes summary)
  const chunks: string[] = [];
  const textChunks: string[] = [];
  const toolCounts = new Map<string, number>();
  let resultSummary = "";

  // Track content block types by index so we know how to handle deltas
  const blockTypes = new Map<number, string>();

  const rl = createInterface({ input: proc.stdout });
  rl.on("line", async (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);

      if (msg.type === "system" && msg.subtype === "init") {
        const sessionId: string | undefined = msg.session_id;
        if (sessionId) {
          await db.update(cards).set({ claudeSessionId: sessionId }).where(eq(cards.id, cardId));
        }
        broadcast("claude:start", { cardId, projectId: project.id, sessionId });

      } else if (msg.type === "result") {
        // Capture the final result summary text
        if (typeof msg.result === "string") resultSummary = msg.result.trim();

      } else if (msg.type === "stream_event") {
        const ev = msg.event;

        if (ev?.type === "content_block_start") {
          const block = ev.content_block;
          blockTypes.set(ev.index, block.type);

          if (block.type === "thinking") {
            const chunk = "💭 ";
            chunks.push(chunk);
            broadcast("claude:stream", { cardId, chunk });
          } else if (block.type === "tool_use") {
            toolCounts.set(block.name, (toolCounts.get(block.name) ?? 0) + 1);
            const chunk = `\n⚡ ${block.name}\n`;
            chunks.push(chunk);
            broadcast("claude:stream", { cardId, chunk });
          }

        } else if (ev?.type === "content_block_delta") {
          const blockType = blockTypes.get(ev.index);
          const delta = ev.delta;

          if (blockType === "thinking" && delta?.type === "thinking_delta" && delta.thinking) {
            chunks.push(delta.thinking);
            broadcast("claude:stream", { cardId, chunk: delta.thinking });
          } else if (blockType === "text" && delta?.type === "text_delta" && delta.text) {
            chunks.push(delta.text);
            textChunks.push(delta.text);
            broadcast("claude:stream", { cardId, chunk: delta.text });
          }
          // skip input_json_delta (tool input JSON) — too noisy

        } else if (ev?.type === "content_block_stop") {
          const blockType = blockTypes.get(ev.index);
          if (blockType === "thinking") {
            const chunk = "\n\n";
            chunks.push(chunk);
            broadcast("claude:stream", { cardId, chunk });
          }
          blockTypes.delete(ev.index);
        }
      }
    } catch { /* non-JSON line — ignore */ }
  });

  let stderrBuf = "";
  proc.stderr.on("data", (data: Buffer) => {
    const text = data.toString();
    stderrBuf += text;
    console.error(`[claude] stderr (${cardId}):`, text.trimEnd());
    // Surface stderr into the stream so users see it in the panel
    const chunk = `\n⚠ ${text.trimEnd()}\n`;
    chunks.push(chunk);
    broadcast("claude:stream", { cardId, chunk });
  });

  proc.on("close", (code, signal) => {
    console.log(`[claude] process closed (${cardId}) code=${code} signal=${signal}`);
  });

  proc.on("exit", async (code) => {
    console.log(`[claude] process exit (${cardId}) code=${code}`);
    activeSessions.delete(cardId);

    const streamDump = chunks.join("");

    // Generate a clean AI summary note
    const aiSummary = await summarizeSession(cardTitle, streamDump, toolCounts);
    const toolsSummary = toolCounts.size > 0
      ? Array.from(toolCounts.entries())
          .map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
          .join(", ")
      : null;
    const notes = [
      aiSummary || resultSummary || textChunks.join("").trim(),
      toolsSummary ? `\n*Tools used: ${toolsSummary}*` : "",
    ].filter(Boolean).join("\n");

    if (code === 0) {
      await db
        .update(cards)
        .set({ claudeStatus: "done", claudeNotes: notes, updatedAt: Date.now() })
        .where(eq(cards.id, cardId));

      // Move card to review column
      const [maxRow] = await db
        .select({ val: max(cards.position) })
        .from(cards)
        .where(and(eq(cards.projectId, project.id), eq(cards.columnId, "review")));
      const newPosition = (maxRow?.val ?? 0) + 1000;

      await db
        .update(cards)
        .set({ columnId: "review", position: newPosition, updatedAt: Date.now() })
        .where(eq(cards.id, cardId));

      const [updated] = await db.select().from(cards).where(eq(cards.id, cardId));
      const formatted = fmtCard(updated);

      emit({ type: "task:moved", data: { card: formatted, projectId: project.id, fromColId: "inProgress", toColId: "review" } });
      broadcast("claude:done", { cardId, projectId: project.id, sessionId: updated.claudeSessionId ?? null, notes: streamDump });
    } else {
      await db
        .update(cards)
        .set({ claudeStatus: "error", updatedAt: Date.now() })
        .where(eq(cards.id, cardId));
      broadcast("claude:error", { cardId, projectId: project.id, error: `Process exited with code ${code}` });
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function spawnSession(
  card: Card,
  project: { id: string; name: string; projectPath: string },
  prompt: string,
) {
  if (activeSessions.has(card.id)) return;

  const args = [
    "-p", prompt,
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--dangerously-skip-permissions",
  ];

  await db.update(cards).set({ claudeStatus: "running", updatedAt: Date.now() }).where(eq(cards.id, card.id));

  runSession(card.id, project, args, card.description, card.title);
}

export async function resumeSession(
  cardId: string,
  sessionId: string,
  prompt: string,
  project: { id: string; name: string; projectPath: string },
) {
  if (activeSessions.has(cardId)) return;

  const [cardRow] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!cardRow) return;

  const args = [
    "--resume", sessionId,
    "-p", prompt,
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--dangerously-skip-permissions",
  ];

  await db.update(cards).set({ claudeStatus: "running", updatedAt: Date.now() }).where(eq(cards.id, cardId));

  runSession(cardId, project, args, cardRow.description ?? "", cardRow.title);
}

// ── Plan session runner ───────────────────────────────────────────────────────

function runPlanSession(
  cardId: string,
  project: { id: string; projectPath: string },
  args: string[],
  cardTitle: string,
  existingPlanContent: string = "",
) {
  const binPath = getSettingValue("claude_bin_path", "claude");
  const cwd = project.projectPath || undefined;

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k !== "CLAUDECODE")
  ) as NodeJS.ProcessEnv;

  console.log(`[plan] spawning for card ${cardId} cwd=${cwd ?? process.cwd()}`);
  const proc = spawn(binPath, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  activePlanSessions.set(cardId, proc);

  proc.on("spawn", () => {
    console.log(`[plan] process spawned (pid=${proc.pid}) for card ${cardId}`);
  });

  proc.on("error", (err) => {
    console.error(`[plan] failed to spawn for card ${cardId}:`, err.message);
    activePlanSessions.delete(cardId);
    db.update(cards).set({ planStatus: "error", updatedAt: Date.now() }).where(eq(cards.id, cardId));
    broadcast("plan:error", { cardId, projectId: project.id, error: err.message });
  });

  const textChunks: string[] = [];
  const blockTypes = new Map<number, string>();
  let newSessionId: string | undefined;

  const rl = createInterface({ input: proc.stdout });
  rl.on("line", async (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);

      if (msg.type === "system" && msg.subtype === "init") {
        newSessionId = msg.session_id as string | undefined;
        if (newSessionId) {
          await db.update(cards).set({ planSessionId: newSessionId }).where(eq(cards.id, cardId));
        }
        broadcast("plan:start", { cardId, projectId: project.id, sessionId: newSessionId });

      } else if (msg.type === "stream_event") {
        const ev = msg.event;

        if (ev?.type === "content_block_start") {
          const block = ev.content_block;
          blockTypes.set(ev.index, block.type);
          if (block.type === "tool_use") {
            broadcast("plan:stream", { cardId, chunk: `\n⚡ ${block.name}\n` });
          }

        } else if (ev?.type === "content_block_delta") {
          const blockType = blockTypes.get(ev.index);
          const delta = ev.delta;
          if (blockType === "text" && delta?.type === "text_delta" && delta.text) {
            textChunks.push(delta.text);
            broadcast("plan:stream", { cardId, chunk: delta.text });
          }
        } else if (ev?.type === "content_block_stop") {
          blockTypes.delete(ev.index);
        }
      }
    } catch { /* non-JSON line */ }
  });

  proc.stderr.on("data", (data: Buffer) => {
    const text = data.toString();
    console.error(`[plan] stderr (${cardId}):`, text.trimEnd());
    broadcast("plan:stream", { cardId, chunk: `\n⚠ ${text.trimEnd()}\n` });
  });

  proc.on("exit", async (code) => {
    console.log(`[plan] process exit (${cardId}) code=${code}`);
    activePlanSessions.delete(cardId);

    if (code === 0) {
      const newText = textChunks.join("");
      const fullContent = existingPlanContent
        ? existingPlanContent + "\n\n" + newText
        : newText;

      await db
        .update(cards)
        .set({ planStatus: "done", planContent: fullContent, updatedAt: Date.now() })
        .where(eq(cards.id, cardId));

      broadcast("plan:done", {
        cardId,
        projectId: project.id,
        sessionId: newSessionId ?? null,
        planContent: fullContent,
      });
    } else {
      await db
        .update(cards)
        .set({ planStatus: "error", updatedAt: Date.now() })
        .where(eq(cards.id, cardId));
      broadcast("plan:error", { cardId, projectId: project.id, error: `Process exited with code ${code}` });
    }
  });
}

export async function spawnPlanSession(
  card: Card,
  project: { id: string; name: string; projectPath: string },
  prompt: string,
) {
  if (activePlanSessions.has(card.id)) return;

  const args = [
    "-p", prompt,
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--allowedTools", "Bash,Glob,Grep,Read,LS",
  ];

  await db.update(cards).set({ planStatus: "running", updatedAt: Date.now() }).where(eq(cards.id, card.id));

  runPlanSession(card.id, project, args, card.title);
}

export async function resumePlanSession(
  cardId: string,
  sessionId: string,
  prompt: string,
  project: { id: string; name: string; projectPath: string },
  existingPlanContent: string = "",
) {
  if (activePlanSessions.has(cardId)) return;

  const [cardRow] = await db.select().from(cards).where(eq(cards.id, cardId));
  if (!cardRow) return;

  const args = [
    "--resume", sessionId,
    "-p", prompt,
    "--output-format", "stream-json",
    "--include-partial-messages",
    "--verbose",
    "--allowedTools", "Bash,Glob,Grep,Read,LS",
  ];

  await db.update(cards).set({ planStatus: "running", updatedAt: Date.now() }).where(eq(cards.id, cardId));

  runPlanSession(cardId, project, args, cardRow.title, existingPlanContent);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

export function buildPrompt(card: Card, project: { name: string; projectPath: string }): string {
  const lines = [
    `You are working on the project "${project.name}" located at: ${project.projectPath || "(no path set)"}`,
    ``,
    `Task: ${card.title}`,
    `Priority: ${card.priority}`,
  ];
  if (card.due) lines.push(`Due: ${card.due}`);
  if (card.tags.length) lines.push(`Tags: ${card.tags.join(", ")}`);
  if (card.assignee) lines.push(`Assignee: ${card.assignee}`);
  if (card.description) lines.push(``, `Description:`, card.description);
  if (card.planContent) lines.push(``, `## Implementation Plan`, ``, card.planContent);
  lines.push(``, `Please complete this task. Follow the implementation plan above if one is provided.`);
  return lines.join("\n");
}

export function buildPlanPrompt(card: Card, project: { name: string; projectPath: string }): string {
  const lines = [
    `You are in PLANNING MODE for the project "${project.name}" at: ${project.projectPath || "(no path set)"}`,
    ``,
    `Analyze the codebase and produce a detailed implementation plan for this task.`,
    `Do NOT make any code changes, write or edit any files, or run state-modifying commands.`,
    `Do NOT ask questions — make reasonable assumptions and document them explicitly.`,
    ``,
    `Task: ${card.title}`,
    `Priority: ${card.priority}`,
  ];
  if (card.due) lines.push(`Due: ${card.due}`);
  if (card.tags.length) lines.push(`Tags: ${card.tags.join(", ")}`);
  if (card.assignee) lines.push(`Assignee: ${card.assignee}`);
  if (card.description) lines.push(``, `Description:`, card.description);
  lines.push(
    ``,
    `Output a markdown plan with these sections:`,
    `## Overview`,
    `## Assumptions`,
    `## Files to Change`,
    `## New Files`,
    `## Implementation Steps`,
    `## Potential Risks`,
    ``,
    `Output only the markdown. No preamble or sign-off.`,
  );
  return lines.join("\n");
}
