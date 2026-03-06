# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run both client (Vite on :5173) and server (Hono on :3001) together
npm run dev

# Run individually
npm run dev:client
npm run dev:server

# Build client for production
npm run build

# Lint (ESLint flat config)
npm run lint

# Server DB migrations (run from repo root)
cd server && npm run generate   # generate migration files via drizzle-kit
cd server && npm run migrate    # apply migrations
```

## Architecture

This is a full-stack kanban project manager called **Kairos**. There is no router library — navigation is a single `activeProject` state in `App.jsx` that switches between `Overview` and `BoardView`.

### Client (`src/`)

- **Vite + React 19, JavaScript only** (no TypeScript on the client)
- **No UI libraries** — all styling is inline styles
- **`AppContext`** (`src/context/AppContext.jsx`) is the single source of truth for `projects[]` and `boards{}` (keyed by projectId). It fetches from the API on mount and subscribes to `/api/events` via SSE for real-time multi-tab sync.
- All board mutations (moveCard, addCard, updateCard, deleteCard) apply **optimistic updates** to local state, then POST/PATCH/DELETE to the API. `moveCard` captures a snapshot for rollback on failure.
- `_syncStats()` in AppContext recomputes `project.tasks` counts and `project.progress` after every board mutation — never compute these manually.
- **`ToastProvider`** (`src/components/Toast.jsx`) wraps the entire app. Use `useToast()` → `showError(msg)` / `showInfo(msg)` for all user-facing error feedback.
- Board data is lazy-loaded: `getBoard(projectId)` triggers a fetch on first call; subsequent calls return cached data.
- `claudeState` in AppContext tracks per-card AI session state (`status`, `chunks`, `sessionId`) updated via SSE `claude:*` events.

### Server (`server/`)

- **Hono + Node.js, TypeScript** via `tsx` (no build step for dev)
- **SQLite** via `better-sqlite3` + **Drizzle ORM** for type-safe queries
- DB file: `server/kairos.db` (auto-created; schema applied inline in `server/db/index.ts` with idempotent `ALTER TABLE` migrations)
- API runs on port **3001**; Vite proxies `/api/*` to it in dev

**API routes:**
- `GET/POST /api/projects` — list / create projects
- `PATCH/DELETE /api/projects/:id` — update / delete project
- `GET /api/projects/:id/board` — returns board with columns + cards
- `POST /api/projects/:id/cards` — create card
- `POST /api/cards/:id/move` — move card between columns
- `PATCH/DELETE /api/cards/:id` — update / delete card
- `GET /api/events` — SSE stream for real-time updates
- `GET/PATCH /api/settings` — key-value settings store

**Event system:** All mutations emit typed events via a Node.js `EventEmitter` (`server/hooks/index.ts`). `server/routes/events.ts` forwards every event to all connected SSE clients. Hook handlers in `server/hooks/handlers/` respond to events (e.g., `onTaskMoved` triggers Claude AI analysis when a card moves to `inProgress` on a Claude-enabled project).

**Claude AI integration:** `server/claude/runner.ts` spawns Claude sessions using `@anthropic-ai/sdk`. Enabled per-project via `claudeEnabled` + `projectPath` fields. Results are streamed back to the client via SSE `claude:stream` / `claude:done` events and persisted as `claudeNotes` on the card.

### DB Schema (key fields)

- `projects`: id, name, description, color, members (JSON array), tag, claudeEnabled, projectPath
- `cards`: id, projectId, columnId, title, priority, assignee, tags (JSON array), due, description, position (REAL for ordering), claudeSessionId, claudeStatus, claudeNotes
- `settings`: key/value store (used for API keys etc.)

### Env

The server reads from a `.env` file at the repo root (loaded via `tsx --env-file=../.env`). `ANTHROPIC_API_KEY` is required for Claude features.
