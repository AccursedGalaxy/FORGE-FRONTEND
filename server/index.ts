import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

// Import DB first to ensure tables exist and seed runs
import "./db/index.ts";

// Register lifecycle hooks
import "./hooks/handlers/index.ts";

import { projectsRouter } from "./routes/projects.ts";
import { cardsRouter } from "./routes/cards.ts";
import { eventsRouter } from "./routes/events.ts";

const app = new Hono();

app.use("*", logger());
app.use("/api/*", cors());

app.route("/api/projects", projectsRouter);
app.route("/api/cards", cardsRouter);
app.route("/api/events", eventsRouter);

app.get("/health", (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: 3001 }, () => {
  console.log("[server] Kairos API running on http://localhost:3001");
});
