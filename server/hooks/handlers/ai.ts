/**
 * AI / LLM hook handlers.
 */

import type { HookEventMap } from "../index.ts";
import { db } from "../../db/index.ts";
import { projects } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import { spawnSession, buildPrompt } from "../../claude/runner.ts";

export function onTaskCreated(_data: HookEventMap["task:created"]) {
  // TODO: call LLM to suggest priority / auto-tag
}

export async function onTaskMoved(data: HookEventMap["task:moved"]) {
  if (data.toColId !== "inProgress") return;

  const [project] = await db.select().from(projects).where(eq(projects.id, data.projectId));
  if (!project || !project.claudeEnabled || !project.projectPath) return;

  const projectObj = {
    id: project.id,
    name: project.name,
    projectPath: project.projectPath ?? "",
  };

  const prompt = buildPrompt(data.card, projectObj);
  await spawnSession(data.card, projectObj, prompt);
}

export function onProjectCreated(_data: HookEventMap["project:created"]) {
  // TODO: LLM-generate initial card suggestions from project.description
}
