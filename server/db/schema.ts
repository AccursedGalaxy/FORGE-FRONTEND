import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").default("#6366f1"),
  members: text("members").default("[]"),
  dueDate: text("due_date").default(""),
  tag: text("tag").default("General"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  columnId: text("column_id").notNull(),
  title: text("title").notNull(),
  priority: text("priority").default("medium"),
  assignee: text("assignee").default(""),
  tags: text("tags").default("[]"),
  due: text("due").default(""),
  description: text("description").default(""),
  position: real("position").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
