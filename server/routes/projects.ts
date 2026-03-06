import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, sqlite } from "../db/index.ts";
import { projects, cards } from "../db/schema.ts";
import { emit } from "../hooks/index.ts";
import { appendCard, formatCard } from "./cards.ts";
import type { Project, Board } from "../types.ts";

export const projectsRouter = new Hono();

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLUMN_TITLES: Record<string, string> = {
  todo: "Backlog",
  inProgress: "In Progress",
  review: "In Review",
  done: "Done",
};
const COLUMN_ORDER = ["todo", "inProgress", "review", "done"];

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── helper re-export so board GET can use it ──────────────────────────────────

type TaskCounts = { todo: number; inProgress: number; review: number; done: number };

function deriveStats(counts: TaskCounts) {
  const total = counts.todo + counts.inProgress + counts.review + counts.done;
  return { tasks: counts, progress: total === 0 ? 0 : Math.round((counts.done / total) * 100) };
}

/** Fetch per-column card counts for one or more projects */
function getTaskCounts(projectIds: string[]): Map<string, TaskCounts> {
  if (projectIds.length === 0) return new Map();
  const placeholders = projectIds.map(() => "?").join(", ");
  const rows = sqlite
    .prepare(
      `SELECT project_id, column_id, COUNT(*) as n FROM cards WHERE project_id IN (${placeholders}) GROUP BY project_id, column_id`
    )
    .all(...projectIds) as { project_id: string; column_id: string; n: number }[];

  const map = new Map<string, TaskCounts>();
  for (const pid of projectIds) {
    map.set(pid, { todo: 0, inProgress: 0, review: 0, done: 0 });
  }
  for (const row of rows) {
    const counts = map.get(row.project_id)!;
    if (row.column_id in counts) (counts as Record<string, number>)[row.column_id] = row.n;
  }
  return map;
}

function formatProject(row: typeof projects.$inferSelect, counts: TaskCounts): Project {
  const { tasks, progress } = deriveStats(counts);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    color: row.color ?? "#6366f1",
    members: JSON.parse(row.members ?? "[]"),
    dueDate: row.dueDate ?? "",
    tag: row.tag ?? "General",
    tasks,
    progress,
    claudeEnabled: (row.claudeEnabled ?? 0) === 1,
    projectPath: row.projectPath ?? "",
  };
}

// ── GET /api/projects ─────────────────────────────────────────────────────────

projectsRouter.get("/", async (c) => {
  const allProjects = await db.select().from(projects);
  const countsMap = getTaskCounts(allProjects.map((p) => p.id));
  const result = allProjects.map((p) => formatProject(p, countsMap.get(p.id)!));
  return c.json(result);
});

// ── POST /api/projects ────────────────────────────────────────────────────────

projectsRouter.post("/", async (c) => {
  const body = await c.req.json<{
    name: string;
    description?: string;
    color?: string;
    members?: string[];
    dueDate?: string;
    tag?: string;
    claudeEnabled?: boolean;
    projectPath?: string;
  }>();

  const now = Date.now();
  const id = generateId("p");

  await db.insert(projects).values({
    id,
    name: body.name,
    description: body.description ?? "",
    color: body.color ?? "#6366f1",
    members: JSON.stringify(body.members ?? []),
    dueDate: body.dueDate ?? "",
    tag: body.tag ?? "General",
    claudeEnabled: body.claudeEnabled ? 1 : 0,
    projectPath: body.projectPath ?? "",
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  const project = formatProject(row, { todo: 0, inProgress: 0, review: 0, done: 0 });

  emit({ type: "project:created", data: { project } });
  return c.json(project, 201);
});

// ── PATCH /api/projects/:id ───────────────────────────────────────────────────

projectsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<{
    name: string;
    description: string;
    color: string;
    members: string[];
    dueDate: string;
    tag: string;
    claudeEnabled: boolean;
    projectPath: string;
  }>>();

  const now = Date.now();
  const updateValues: Record<string, unknown> = { updatedAt: now };
  if (body.name !== undefined) updateValues.name = body.name;
  if (body.description !== undefined) updateValues.description = body.description;
  if (body.color !== undefined) updateValues.color = body.color;
  if (body.members !== undefined) updateValues.members = JSON.stringify(body.members);
  if (body.dueDate !== undefined) updateValues.dueDate = body.dueDate;
  if (body.tag !== undefined) updateValues.tag = body.tag;
  if (body.claudeEnabled !== undefined) updateValues.claudeEnabled = body.claudeEnabled ? 1 : 0;
  if (body.projectPath !== undefined) updateValues.projectPath = body.projectPath;

  await db.update(projects).set(updateValues).where(eq(projects.id, id));

  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  if (!row) return c.json({ error: "not found" }, 404);

  const countsMap = getTaskCounts([id]);
  const project = formatProject(row, countsMap.get(id)!);

  emit({ type: "project:updated", data: { project, changes: body } });
  return c.json(project);
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────

projectsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await db.delete(projects).where(eq(projects.id, id)); // cards cascade
  emit({ type: "project:deleted", data: { projectId: id } });
  return c.json({ ok: true });
});

// ── GET /api/projects/:id/board ───────────────────────────────────────────────

projectsRouter.get("/:id/board", async (c) => {
  const id = c.req.param("id");

  const allCards = await db
    .select()
    .from(cards)
    .where(eq(cards.projectId, id))
    .orderBy(cards.position);

  const colMap = new Map<string, ReturnType<typeof formatCard>[]>();
  for (const colId of COLUMN_ORDER) colMap.set(colId, []);

  for (const row of allCards) {
    const col = colMap.get(row.columnId);
    if (col) col.push(formatCard(row));
  }

  const board: Board = {
    columns: COLUMN_ORDER.map((colId) => ({
      id: colId,
      title: COLUMN_TITLES[colId],
      cards: colMap.get(colId)!,
    })),
  };

  return c.json(board);
});

// ── POST /api/projects/:id/cards ──────────────────────────────────────────────

projectsRouter.post("/:id/cards", async (c) => {
  const projectId = c.req.param("id");
  const body = await c.req.json<{
    colId: string;
    title: string;
    priority?: string;
    assignee?: string;
    tags?: string[];
    due?: string;
    description?: string;
  }>();

  const { colId, ...cardData } = body;
  const card = await appendCard(projectId, colId, cardData);

  emit({ type: "task:created", data: { card, projectId, colId } });
  return c.json(card, 201);
});
