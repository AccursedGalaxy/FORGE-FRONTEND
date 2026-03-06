import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, sqlite } from "../db/index.ts";
import { projects } from "../db/schema.ts";
import type { ProjectDocs } from "../types.ts";

export const docsRouter = new Hono();

// ── GET /api/projects/:id/docs ────────────────────────────────────────────────

docsRouter.get("/", async (c) => {
  const id = c.req.param("id");

  const row = sqlite
    .prepare("SELECT project_path, readme, spec FROM projects WHERE id = ?")
    .get(id) as { project_path: string; readme: string; spec: string } | undefined;

  if (!row) return c.json({ error: "not found" }, 404);

  const projectPath = row.project_path ?? "";
  let readme = row.readme ?? "";
  let spec = row.spec ?? "";
  let readmeFromDisk = false;
  let specFromDisk = false;

  if (projectPath) {
    const dbUpdates: Record<string, string> = {};

    try {
      readme = await readFile(path.join(projectPath, "README.md"), "utf-8");
      readmeFromDisk = true;
      dbUpdates.readme = readme;
    } catch (err: any) {
      if (err.code !== "ENOENT") console.warn("[docs] readme read error:", err.message);
    }

    try {
      spec = await readFile(path.join(projectPath, "SPEC.md"), "utf-8");
      specFromDisk = true;
      dbUpdates.spec = spec;
    } catch (err: any) {
      if (err.code !== "ENOENT") console.warn("[docs] spec read error:", err.message);
    }

    if (Object.keys(dbUpdates).length > 0) {
      // Fire-and-forget DB cache update
      db.update(projects)
        .set({ ...dbUpdates, updatedAt: Date.now() })
        .where(eq(projects.id, id))
        .catch((e) => console.warn("[docs] cache update error:", e));
    }
  }

  const result: ProjectDocs = { readme, spec, readmeFromDisk, specFromDisk };
  return c.json(result);
});

// ── PATCH /api/projects/:id/docs ──────────────────────────────────────────────

docsRouter.patch("/", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ readme?: string; spec?: string }>();

  const row = sqlite
    .prepare("SELECT project_path FROM projects WHERE id = ?")
    .get(id) as { project_path: string } | undefined;

  if (!row) return c.json({ error: "not found" }, 404);

  const projectPath = row.project_path ?? "";
  const now = Date.now();
  const dbValues: Record<string, unknown> = { updatedAt: now };

  if (body.readme !== undefined) dbValues.readme = body.readme;
  if (body.spec !== undefined) dbValues.spec = body.spec;

  await db.update(projects).set(dbValues).where(eq(projects.id, id));

  if (projectPath) {
    if (body.readme !== undefined) {
      try {
        await writeFile(path.join(projectPath, "README.md"), body.readme, "utf-8");
      } catch (err: any) {
        return c.json({ error: `Failed to write README.md: ${err.message}` }, 500);
      }
    }
    if (body.spec !== undefined) {
      try {
        await writeFile(path.join(projectPath, "SPEC.md"), body.spec, "utf-8");
      } catch (err: any) {
        return c.json({ error: `Failed to write SPEC.md: ${err.message}` }, 500);
      }
    }
  }

  const updatedRow = sqlite
    .prepare("SELECT readme, spec FROM projects WHERE id = ?")
    .get(id) as { readme: string; spec: string };

  return c.json({ ok: true, readme: updatedRow.readme ?? "", spec: updatedRow.spec ?? "" });
});
