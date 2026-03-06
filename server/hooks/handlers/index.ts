import { emitter } from "../index.ts";
// Future: import { llmHandler } from "./llm.ts";
// Future: import { claudeCodeHandler } from "./claude-code.ts";

emitter.on("task:created", (data) => {
  console.log("[hook] task:created", data.card.id, `"${data.card.title}"`);
  // TODO: trigger LLM suggestion, Claude Code, etc.
});

emitter.on("task:moved", (data) => {
  console.log("[hook] task:moved", data.card.id, `${data.fromColId} → ${data.toColId}`);
});

emitter.on("task:updated", (data) => {
  console.log("[hook] task:updated", data.card.id, Object.keys(data.changes));
});

emitter.on("task:deleted", (data) => {
  console.log("[hook] task:deleted", data.cardId);
});

emitter.on("project:created", (data) => {
  console.log("[hook] project:created", data.project.id, `"${data.project.name}"`);
});

emitter.on("project:updated", (data) => {
  console.log("[hook] project:updated", data.project.id, Object.keys(data.changes));
});

emitter.on("project:deleted", (data) => {
  console.log("[hook] project:deleted", data.projectId);
});
