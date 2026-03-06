import { Hono } from "hono";
import { eq, and, max } from "drizzle-orm";
import { db, sqlite } from "../db/index.ts";
import { cards, projects } from "../db/schema.ts";
import { emit } from "../hooks/index.ts";
import { broadcast } from "./events.ts";
import { activeSessions, activePlanSessions, spawnSession, resumeSession, buildPrompt, spawnPlanSession, resumePlanSession, buildPlanPrompt } from "../claude/runner.ts";
import type { Card } from "../types.ts";

export const cardsRouter = new Hono();

export function formatCard(row: typeof cards.$inferSelect): Card {
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

export function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function appendCard(
  projectId: string,
  colId: string,
  body: {
    title: string;
    priority?: string;
    assignee?: string;
    tags?: string[];
    due?: string;
    description?: string;
  }
) {
  const now = Date.now();
  const id = generateId("c");

  const [maxRow] = await db
    .select({ val: max(cards.position) })
    .from(cards)
    .where(and(eq(cards.projectId, projectId), eq(cards.columnId, colId)));
  const position = (maxRow?.val ?? 0) + 1000;

  await db.insert(cards).values({
    id,
    projectId,
    columnId: colId,
    title: body.title,
    priority: body.priority ?? "medium",
    assignee: body.assignee ?? "",
    tags: JSON.stringify(body.tags ?? []),
    due: body.due ?? "",
    description: body.description ?? "",
    position,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(cards).where(eq(cards.id, id));
  return formatCard(row);
}

// ── PATCH /api/cards/:id ──────────────────────────────────────────────────────

cardsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<{
    title: string;
    priority: string;
    assignee: string;
    tags: string[];
    due: string;
    description: string;
  }>>();

  const now = Date.now();
  const updateValues: Record<string, unknown> = { updatedAt: now };
  if (body.title !== undefined) updateValues.title = body.title;
  if (body.priority !== undefined) updateValues.priority = body.priority;
  if (body.assignee !== undefined) updateValues.assignee = body.assignee;
  if (body.tags !== undefined) updateValues.tags = JSON.stringify(body.tags);
  if (body.due !== undefined) updateValues.due = body.due;
  if (body.description !== undefined) updateValues.description = body.description;

  await db.update(cards).set(updateValues).where(eq(cards.id, id));

  const [row] = await db.select().from(cards).where(eq(cards.id, id));
  if (!row) return c.json({ error: "not found" }, 404);

  const card = formatCard(row);
  emit({ type: "task:updated", data: { card, projectId: row.projectId, changes: body } });
  return c.json(card);
});

// ── DELETE /api/cards/:id ─────────────────────────────────────────────────────

cardsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db.select().from(cards).where(eq(cards.id, id));
  if (!row) return c.json({ error: "not found" }, 404);

  await db.delete(cards).where(eq(cards.id, id));
  emit({ type: "task:deleted", data: { cardId: id, projectId: row.projectId } });
  return c.json({ ok: true });
});

// ── POST /api/cards/:id/move ──────────────────────────────────────────────────

cardsRouter.post("/:id/move", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ toColId: string; targetCardId?: string }>();

  const [card] = await db.select().from(cards).where(eq(cards.id, id));
  if (!card) return c.json({ error: "not found" }, 404);

  const fromColId = card.columnId;
  const toColId = body.toColId;
  const now = Date.now();
  let newPosition: number;

  if (body.targetCardId) {
    const [target] = await db.select().from(cards).where(eq(cards.id, body.targetCardId));
    if (!target) return c.json({ error: "target card not found" }, 404);

    const prevRow = sqlite
      .prepare(
        `SELECT position FROM cards WHERE project_id = ? AND column_id = ? AND position < ? AND id != ? ORDER BY position DESC LIMIT 1`
      )
      .get(card.projectId, toColId, target.position, id) as { position: number } | undefined;

    const prevPos = prevRow?.position ?? 0;
    newPosition = (prevPos + target.position) / 2;
  } else {
    const [maxRow] = await db
      .select({ val: max(cards.position) })
      .from(cards)
      .where(and(eq(cards.projectId, card.projectId), eq(cards.columnId, toColId)));
    newPosition = (maxRow?.val ?? 0) + 1000;
  }

  await db
    .update(cards)
    .set({ columnId: toColId, position: newPosition, updatedAt: now })
    .where(eq(cards.id, id));

  const [updated] = await db.select().from(cards).where(eq(cards.id, id));
  const formatted = formatCard(updated);
  emit({ type: "task:moved", data: { card: formatted, projectId: card.projectId, fromColId, toColId } });
  return c.json(formatted);
});

// ── POST /api/cards/:id/claude/trigger ────────────────────────────────────────

cardsRouter.post("/:id/claude/trigger", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ prompt?: string }>().catch(() => ({}));

  if (activeSessions.has(id)) {
    return c.json({ error: "session already running" }, 409);
  }

  const [cardRow] = await db.select().from(cards).where(eq(cards.id, id));
  if (!cardRow) return c.json({ error: "not found" }, 404);

  const [projectRow] = await db.select().from(projects).where(eq(projects.id, cardRow.projectId));
  if (!projectRow) return c.json({ error: "project not found" }, 404);

  if (!projectRow.claudeEnabled) {
    return c.json({ error: "claude not enabled for this project" }, 403);
  }

  const project = {
    id: projectRow.id,
    name: projectRow.name,
    projectPath: projectRow.projectPath ?? "",
  };
  const card = formatCard(cardRow);

  if (body.prompt && cardRow.claudeSessionId) {
    // Resume with follow-up prompt
    await resumeSession(id, cardRow.claudeSessionId, body.prompt, project);
  } else {
    const prompt = body.prompt ?? buildPrompt(card, project);
    await spawnSession(card, project, prompt);
  }

  return c.json({ ok: true });
});

// ── POST /api/cards/:id/claude/abort ─────────────────────────────────────────

cardsRouter.post("/:id/claude/abort", async (c) => {
  const id = c.req.param("id");
  const proc = activeSessions.get(id);

  if (!proc) {
    return c.json({ error: "no active session" }, 404);
  }

  proc.kill("SIGTERM");
  activeSessions.delete(id);

  await db
    .update(cards)
    .set({ claudeStatus: null, updatedAt: Date.now() })
    .where(eq(cards.id, id));

  const [cardRow] = await db.select().from(cards).where(eq(cards.id, id));
  if (cardRow) {
    broadcast("claude:error", { cardId: id, projectId: cardRow.projectId, error: "aborted by user" });
  }

  return c.json({ ok: true });
});

// ── POST /api/cards/:id/plan/trigger ─────────────────────────────────────────

cardsRouter.post("/:id/plan/trigger", async (c) => {
  const id = c.req.param("id");

  if (activePlanSessions.has(id)) {
    return c.json({ error: "plan session already running" }, 409);
  }

  const [cardRow] = await db.select().from(cards).where(eq(cards.id, id));
  if (!cardRow) return c.json({ error: "not found" }, 404);

  const [projectRow] = await db.select().from(projects).where(eq(projects.id, cardRow.projectId));
  if (!projectRow) return c.json({ error: "project not found" }, 404);

  if (!projectRow.claudeEnabled) {
    return c.json({ error: "claude not enabled for this project" }, 403);
  }

  const project = {
    id: projectRow.id,
    name: projectRow.name,
    projectPath: projectRow.projectPath ?? "",
  };
  const card = formatCard(cardRow);
  const prompt = buildPlanPrompt(card, project);
  await spawnPlanSession(card, project, prompt);

  return c.json({ ok: true });
});

// ── POST /api/cards/:id/plan/abort ────────────────────────────────────────────

cardsRouter.post("/:id/plan/abort", async (c) => {
  const id = c.req.param("id");
  const proc = activePlanSessions.get(id);

  if (!proc) {
    return c.json({ error: "no active plan session" }, 404);
  }

  proc.kill("SIGTERM");
  activePlanSessions.delete(id);

  await db
    .update(cards)
    .set({ planStatus: null, updatedAt: Date.now() })
    .where(eq(cards.id, id));

  const [cardRow] = await db.select().from(cards).where(eq(cards.id, id));
  if (cardRow) {
    broadcast("plan:error", { cardId: id, projectId: cardRow.projectId, error: "aborted by user" });
  }

  return c.json({ ok: true });
});

// ── POST /api/cards/:id/plan/reply ────────────────────────────────────────────

cardsRouter.post("/:id/plan/reply", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ prompt: string }>();

  if (!body.prompt?.trim()) {
    return c.json({ error: "prompt required" }, 400);
  }
  if (activePlanSessions.has(id)) {
    return c.json({ error: "plan session already running" }, 409);
  }

  const [cardRow] = await db.select().from(cards).where(eq(cards.id, id));
  if (!cardRow) return c.json({ error: "not found" }, 404);
  if (!cardRow.planSessionId) return c.json({ error: "no plan session to resume" }, 400);

  const [projectRow] = await db.select().from(projects).where(eq(projects.id, cardRow.projectId));
  if (!projectRow) return c.json({ error: "project not found" }, 404);

  const project = {
    id: projectRow.id,
    name: projectRow.name,
    projectPath: projectRow.projectPath ?? "",
  };

  await resumePlanSession(id, cardRow.planSessionId, body.prompt, project, cardRow.planContent ?? "");
  return c.json({ ok: true });
});

// ── POST /api/cards/:id/claude/hook ──────────────────────────────────────────

cardsRouter.post("/:id/claude/hook", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));

  // Observability: broadcast tool-use events as stream chunks
  const eventName = (body.event as string) ?? (body.tool_name as string) ?? "hook";
  const chunk = `[tool: ${eventName}]\n`;
  broadcast("claude:stream", { cardId: id, chunk });

  console.log(`[claude:hook] card=${id}`, JSON.stringify(body).slice(0, 200));
  return c.json({ ok: true });
});
