import { Hono } from "hono";
import { emitter } from "../hooks/index.ts";

type SendFn = (data: string) => void;
export const clients = new Set<SendFn>();

export function broadcast(type: string, data: unknown) {
  const payload = `data: ${JSON.stringify({ type, data })}\n\n`;
  for (const send of clients) send(payload);
}

// Subscribe to all lifecycle events and broadcast to SSE clients
const EVENT_TYPES = [
  "task:created", "task:moved", "task:updated", "task:deleted",
  "project:created", "project:updated", "project:deleted",
  "claude:start", "claude:stream", "claude:done", "claude:error",
  "plan:start", "plan:stream", "plan:done", "plan:error",
] as const;

for (const type of EVENT_TYPES) {
  emitter.on(type, (data) => broadcast(type, data));
}

export const eventsRouter = new Hono();

eventsRouter.get("/", (c) => {
  let sendFn: SendFn | null = null;

  const body = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      sendFn = (payload: string) => {
        try {
          controller.enqueue(enc.encode(payload));
        } catch {
          if (sendFn) clients.delete(sendFn);
          sendFn = null;
        }
      };

      clients.add(sendFn);
      // Initial heartbeat
      sendFn(`data: ${JSON.stringify({ type: "connected", data: { ts: Date.now() } })}\n\n`);
    },
    cancel() {
      if (sendFn) {
        clients.delete(sendFn);
        sendFn = null;
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
