# Kairos

A Kanban-style project management app with integrated Claude Code AI automation. Cards move through columns, and when one lands in **In Progress**, Claude Code picks up the task and gets to work — streaming output directly into the UI.

## Stack

**Frontend** — React 19 + Vite, no UI library, all inline styles
**Backend** — Hono on Node.js, SQLite via Drizzle ORM, TypeScript

## Getting Started

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Run frontend + backend together
npm run dev
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| API      | http://localhost:3001  |

### Other dev commands

```bash
npm run dev:client   # Vite only
npm run dev:server   # Hono server only
npm run dev:network  # Both, exposed on local network
```

### Database

```bash
cd server
npm run generate  # Generate migration files
npm run migrate   # Apply migrations
```

## Claude Code Integration

Enable Claude Code per-project via **project settings** (toggle + file path). When a card is moved to **In Progress**, the server automatically:

1. Builds a prompt from the card title, description, and project context
2. Spawns a Claude Code session pointed at the configured project directory
3. Streams output back to the frontend in real time via SSE

The **Claude Panel** inside each card modal shows live output with styled segments: thinking blocks, tool calls, warnings, and response text. Sessions can be aborted mid-run or resumed with a follow-up prompt.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/cards?projectId=` | List cards for a project |
| POST | `/api/cards` | Create card |
| PATCH | `/api/cards/:id` | Update card |
| DELETE | `/api/cards/:id` | Delete card |
| POST | `/api/cards/:id/claude/trigger` | Trigger Claude Code on a card |
| POST | `/api/cards/:id/claude/abort` | Abort running session |
| GET | `/api/events` | SSE stream for real-time updates |
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings/:key` | Upsert a setting |
| GET | `/health` | Health check |
