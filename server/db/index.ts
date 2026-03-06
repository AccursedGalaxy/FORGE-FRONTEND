import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "kairos.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables on first run
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#6366f1',
    members TEXT DEFAULT '[]',
    due_date TEXT DEFAULT '',
    tag TEXT DEFAULT 'General',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    assignee TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    due TEXT DEFAULT '',
    description TEXT DEFAULT '',
    position REAL NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Idempotent migrations — safe to run on existing DBs
for (const stmt of [
  `ALTER TABLE projects ADD COLUMN claude_enabled INTEGER DEFAULT 0`,
  `ALTER TABLE projects ADD COLUMN project_path TEXT DEFAULT ''`,
  `ALTER TABLE cards ADD COLUMN claude_session_id TEXT DEFAULT NULL`,
  `ALTER TABLE cards ADD COLUMN claude_status TEXT DEFAULT NULL`,
  `ALTER TABLE cards ADD COLUMN claude_notes TEXT DEFAULT ''`,
  `ALTER TABLE cards ADD COLUMN plan_session_id TEXT DEFAULT NULL`,
  `ALTER TABLE cards ADD COLUMN plan_status TEXT DEFAULT NULL`,
  `ALTER TABLE cards ADD COLUMN plan_content TEXT DEFAULT ''`,
  `ALTER TABLE projects ADD COLUMN readme TEXT DEFAULT ''`,
  `ALTER TABLE projects ADD COLUMN spec TEXT DEFAULT ''`,
]) {
  try {
    sqlite.exec(stmt);
  } catch { /* column already exists */ }
}

export const db = drizzle(sqlite, { schema });
export { sqlite };

// Reset any cards left in "running" state from a previous crashed/restarted server.
// If we're booting, all prior process handles are gone — mark them as error.
const staleCount = sqlite.prepare(
  `UPDATE cards SET claude_status = 'error' WHERE claude_status = 'running'`
).run();
if (staleCount.changes > 0) {
  console.log(`[db] reset ${staleCount.changes} stale claude session(s) to 'error'`);
}

const stalePlanCount = sqlite.prepare(
  `UPDATE cards SET plan_status = 'error' WHERE plan_status = 'running'`
).run();
if (stalePlanCount.changes > 0) {
  console.log(`[db] reset ${stalePlanCount.changes} stale plan session(s) to 'error'`);
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export function getSettingValue(key: string, defaultValue = ""): string {
  const row = sqlite
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? defaultValue;
}

export function setSettingValue(key: string, value: string): void {
  sqlite
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

// ── Seed initial data if DB is empty ─────────────────────────────────────────

const projectCount = sqlite.prepare("SELECT COUNT(*) as n FROM projects").get() as { n: number };
if (projectCount.n === 0) {
  console.log("[db] seeding initial data...");
  seedInitialData();
}

function seedInitialData() {
  const now = Date.now();

  const insertProject = sqlite.prepare(`
    INSERT INTO projects (id, name, description, color, members, due_date, tag, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCard = sqlite.prepare(`
    INSERT INTO cards (id, project_id, column_id, title, priority, assignee, tags, due, description, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedTx = sqlite.transaction(() => {
    // Projects
    insertProject.run("p1", "Midnight Redesign", "Full UI overhaul of the consumer dashboard. Shipping Q2.", "#6366f1", JSON.stringify(["AK", "JR", "MS"]), "Apr 30", "Design", now, now);
    insertProject.run("p2", "API Gateway v3", "GraphQL migration + rate limiting + new auth layer.", "#10b981", JSON.stringify(["TD", "LS"]), "May 15", "Engineering", now, now);
    insertProject.run("p3", "Ops Automation", "Incident playbooks, auto-escalation, runbook generator.", "#f59e0b", JSON.stringify(["RB", "AK", "ZW"]), "Apr 10", "Operations", now, now);
    insertProject.run("p4", "Growth Experiments", "A/B tests, funnel analysis, referral program v2.", "#ec4899", JSON.stringify(["JR", "TD"]), "Jun 01", "Growth", now, now);

    // p1 cards
    insertCard.run("c1", "p1", "todo", "Audit current component library", "low", "AK", JSON.stringify(["research"]), "Apr 5", "", 1000, now, now);
    insertCard.run("c2", "p1", "todo", "Define new color token system", "high", "JR", JSON.stringify(["tokens", "design"]), "Apr 8", "", 2000, now, now);
    insertCard.run("c3", "p1", "todo", "Motion design principles doc", "medium", "MS", JSON.stringify(["docs"]), "Apr 12", "", 3000, now, now);
    insertCard.run("c4", "p1", "todo", "Accessibility audit round 2", "high", "AK", JSON.stringify(["a11y"]), "Apr 20", "", 4000, now, now);
    insertCard.run("c5", "p1", "inProgress", "Redesign nav & sidebar", "high", "JR", JSON.stringify(["nav", "design"]), "Apr 6", "", 1000, now, now);
    insertCard.run("c6", "p1", "inProgress", "New card component variants", "medium", "MS", JSON.stringify(["components"]), "Apr 9", "", 2000, now, now);
    insertCard.run("c7", "p1", "inProgress", "Dark mode token pass", "low", "AK", JSON.stringify(["tokens"]), "Apr 11", "", 3000, now, now);
    insertCard.run("c8", "p1", "review", "Hero section prototype", "high", "JR", JSON.stringify(["prototype"]), "Apr 4", "", 1000, now, now);
    insertCard.run("c9", "p1", "review", "Onboarding flow revamp", "medium", "MS", JSON.stringify(["ux", "flow"]), "Apr 5", "", 2000, now, now);
    insertCard.run("c10", "p1", "done", "Initial kickoff & scope doc", "low", "AK", JSON.stringify(["docs"]), "Mar 20", "", 1000, now, now);
    insertCard.run("c11", "p1", "done", "Competitor UX teardown", "low", "JR", JSON.stringify(["research"]), "Mar 22", "", 2000, now, now);

    // p2 cards
    insertCard.run("d1", "p2", "todo", "Schema migration plan", "high", "TD", JSON.stringify(["gql"]), "May 2", "", 1000, now, now);
    insertCard.run("d2", "p2", "todo", "Rate limiter algorithm selection", "medium", "LS", JSON.stringify(["infra"]), "May 5", "", 2000, now, now);
    insertCard.run("d3", "p2", "todo", "Auth service abstraction", "high", "TD", JSON.stringify(["auth"]), "May 8", "", 3000, now, now);
    insertCard.run("d4", "p2", "inProgress", "GraphQL resolver layer", "high", "LS", JSON.stringify(["gql", "api"]), "Apr 28", "", 1000, now, now);
    insertCard.run("d5", "p2", "inProgress", "API versioning strategy", "medium", "TD", JSON.stringify(["docs"]), "Apr 30", "", 2000, now, now);
    insertCard.run("d6", "p2", "review", "OAuth 2.0 integration PR", "high", "LS", JSON.stringify(["auth"]), "Apr 24", "", 1000, now, now);
    insertCard.run("d7", "p2", "done", "v2 API deprecation notice", "low", "TD", JSON.stringify(["comms"]), "Mar 30", "", 1000, now, now);
  });

  seedTx();
  console.log("[db] seed complete");
}
