/**
 * AI / LLM hook handlers.
 *
 * Each handler receives the event payload typed via HookEventMap.
 * Uncomment and implement as AI features are added.
 *
 * Expected integrations:
 *   - task:created   → suggest subtasks, auto-assign priority via LLM
 *   - task:moved     → detect blockers when moved to "review", ping reviewer
 *   - project:created → generate initial backlog from description via LLM
 */

import type { HookEventMap } from "../index.ts";

export function onTaskCreated(data: HookEventMap["task:created"]) {
  // TODO: call LLM to suggest priority / auto-tag
  // TODO: notify assigned member
}

export function onTaskMoved(data: HookEventMap["task:moved"]) {
  // TODO: if toColId === "review", trigger review notification
  // TODO: if toColId === "done", check if project is 100% complete
}

export function onProjectCreated(data: HookEventMap["project:created"]) {
  // TODO: LLM-generate initial card suggestions from project.description
}
