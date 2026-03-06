import { EventEmitter } from "node:events";
import type { Card, Project } from "../types.ts";

export type KairosEvent =
  | { type: "task:created";  data: { card: Card; projectId: string; colId: string } }
  | { type: "task:moved";    data: { card: Card; projectId: string; fromColId: string; toColId: string } }
  | { type: "task:updated";  data: { card: Card; projectId: string; changes: Partial<Card> } }
  | { type: "task:deleted";  data: { cardId: string; projectId: string } }
  | { type: "project:created"; data: { project: Project } }
  | { type: "project:updated"; data: { project: Project; changes: Partial<Project> } }
  | { type: "project:deleted"; data: { projectId: string } }
  | { type: "claude:start";  data: { cardId: string; projectId: string; sessionId?: string } }
  | { type: "claude:stream"; data: { cardId: string; chunk: string } }
  | { type: "claude:done";   data: { cardId: string; projectId: string; sessionId: string | null; notes: string } }
  | { type: "claude:error";  data: { cardId: string; projectId: string; error: string } };

/** Typed map from event name to its payload — used by hook handlers for type safety. */
export type HookEventMap = {
  "task:created":    { card: Card; projectId: string; colId: string };
  "task:moved":      { card: Card; projectId: string; fromColId: string; toColId: string };
  "task:updated":    { card: Card; projectId: string; changes: Partial<Card> };
  "task:deleted":    { cardId: string; projectId: string };
  "project:created": { project: Project };
  "project:updated": { project: Project; changes: Partial<Project> };
  "project:deleted": { projectId: string };
};

export const emitter = new EventEmitter();

export function emit(event: KairosEvent) {
  emitter.emit(event.type, event.data);
}
