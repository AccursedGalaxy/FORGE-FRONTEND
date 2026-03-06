import { Hono } from "hono";
import { db } from "../db/index.ts";
import { settings } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export const settingsRouter = new Hono();

settingsRouter.get("/", async (c) => {
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return c.json(result);
});

settingsRouter.put("/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json<{ value: string }>();
  await db
    .insert(settings)
    .values({ key, value: body.value })
    .onConflictDoUpdate({ target: settings.key, set: { value: body.value } });
  return c.json({ key, value: body.value });
});
