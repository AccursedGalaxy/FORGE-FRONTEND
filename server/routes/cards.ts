import { Hono } from "hono";
import { eq, and, max } from "drizzle-orm";
import { db, sqlite } from "../db/index.ts";
import { cards } from "../db/schema.ts";
import { emit } from "../hooks/index.ts";

export const cardsRouter = new Hono();

export function formatCard(row: typeof cards.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    priority: (row.priority ?? "medium") as "high" | "medium" | "low",
    assignee: row.assignee ?? "",
    tags: JSON.parse(row.tags ?? "[]") as string[],
    due: row.due ?? "",
    description: row.description ?? "",
  };
}

export function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function appendCard(
  projectId: string,
  colId: string,
  body: {
    title: string;
    priority?: string;
    assignee?: string;
    tags?: string[];
    due?: string;
    description?: string;
  }
) {
  const now = Date.now();
  const id = generateId("c");

  const [maxRow] = await db
    .select({ val: max(cards.position) })
    .from(cards)
    .where(and(eq(cards.projectId, projectId), eq(cards.columnId, colId)));
  const position = (maxRow?.val ?? 0) + 1000;

  await db.insert(cards).values({
    id,
    projectId,
    columnId: colId,
    title: body.title,
    priority: body.priority ?? "medium",
    assignee: body.assignee ?? "",
    tags: JSON.stringify(body.tags ?? []),
    due: body.due ?? "",
    description: body.description ?? "",
    position,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db.select().from(cards).where(eq(cards.id, id));
  return formatCard(row);
}

// ── PATCH /api/cards/:id ──────────────────────────────────────────────────────

cardsRouter.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<{
    title: string;
    priority: string;
    assignee: string;
    tags: string[];
    due: string;
    description: string;
  }>>();

  const now = Date.now();
  const updateValues: Record<string, unknown> = { updatedAt: now };
  if (body.title !== undefined) updateValues.title = body.title;
  if (body.priority !== undefined) updateValues.priority = body.priority;
  if (body.assignee !== undefined) updateValues.assignee = body.assignee;
  if (body.tags !== undefined) updateValues.tags = JSON.stringify(body.tags);
  if (body.due !== undefined) updateValues.due = body.due;
  if (body.description !== undefined) updateValues.description = body.description;

  await db.update(cards).set(updateValues).where(eq(cards.id, id));

  const [row] = await db.select().from(cards).where(eq(cards.id, id));
  if (!row) return c.json({ error: "not found" }, 404);

  const card = formatCard(row);
  emit({ type: "task:updated", data: { card, projectId: row.projectId, changes: body } });
  return c.json(card);
});

// ── DELETE /api/cards/:id ─────────────────────────────────────────────────────

cardsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db.select().from(cards).where(eq(cards.id, id));
  if (!row) return c.json({ error: "not found" }, 404);

  await db.delete(cards).where(eq(cards.id, id));
  emit({ type: "task:deleted", data: { cardId: id, projectId: row.projectId } });
  return c.json({ ok: true });
});

// ── POST /api/cards/:id/move ──────────────────────────────────────────────────

cardsRouter.post("/:id/move", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ toColId: string; targetCardId?: string }>();

  const [card] = await db.select().from(cards).where(eq(cards.id, id));
  if (!card) return c.json({ error: "not found" }, 404);

  const fromColId = card.columnId;
  const toColId = body.toColId;
  const now = Date.now();
  let newPosition: number;

  if (body.targetCardId) {
    const [target] = await db.select().from(cards).where(eq(cards.id, body.targetCardId));
    if (!target) return c.json({ error: "target card not found" }, 404);

    const prevRow = sqlite
      .prepare(
        `SELECT position FROM cards WHERE project_id = ? AND column_id = ? AND position < ? AND id != ? ORDER BY position DESC LIMIT 1`
      )
      .get(card.projectId, toColId, target.position, id) as { position: number } | undefined;

    const prevPos = prevRow?.position ?? 0;
    newPosition = (prevPos + target.position) / 2;
  } else {
    const [maxRow] = await db
      .select({ val: max(cards.position) })
      .from(cards)
      .where(and(eq(cards.projectId, card.projectId), eq(cards.columnId, toColId)));
    newPosition = (maxRow?.val ?? 0) + 1000;
  }

  await db
    .update(cards)
    .set({ columnId: toColId, position: newPosition, updatedAt: now })
    .where(eq(cards.id, id));

  const [updated] = await db.select().from(cards).where(eq(cards.id, id));
  const formatted = formatCard(updated);
  emit({ type: "task:moved", data: { card: formatted, projectId: card.projectId, fromColId, toColId } });
  return c.json(formatted);
});
