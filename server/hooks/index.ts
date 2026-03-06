import { EventEmitter } from "node:events";
import type { Card, Project } from "../types.ts";

export type KairosEvent =
  | { type: "task:created";  data: { card: Card; projectId: string; colId: string } }
  | { type: "task:moved";    data: { card: Card; projectId: string; fromColId: string; toColId: string } }
  | { type: "task:updated";  data: { card: Card; projectId: string; changes: Partial<Card> } }
  | { type: "task:deleted";  data: { cardId: string; projectId: string } }
  | { type: "project:created"; data: { project: Project } }
  | { type: "project:updated"; data: { project: Project; changes: Partial<Project> } }
  | { type: "project:deleted"; data: { projectId: string } };

export const emitter = new EventEmitter();

export function emit(event: KairosEvent) {
  emitter.emit(event.type, event.data);
}
