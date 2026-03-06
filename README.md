# Kairos

A Kanban-style project management app with integrated Claude Code AI automation.

## Stack

**Frontend**
- React 19 + Vite
- No UI library — all inline styles
- Fonts: Syne, DM Sans, DM Mono (Google Fonts)

**Backend** (`/server`)
- Hono on Node.js
- SQLite via better-sqlite3 + Drizzle ORM
- TypeScript + tsx

## Getting Started

Install dependencies for both the frontend and server:

```bash
npm install
cd server && npm install && cd ..
```

Run both concurrently in development:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Individual processes

```bash
npm run dev:client   # Vite only
npm run dev:server   # Hono server only
npm run dev:network  # Both, exposed on local network
```

### Database migrations

```bash
cd server
npm run generate   # Generate migration files
npm run migrate    # Apply migrations
```

## Project Structure

```
/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── context/
│   │   └── AppContext.jsx        # Central state + SSE listener
│   ├── data/
│   │   └── initialData.js        # Seed data
│   ├── utils/
│   │   └── helpers.js            # PRIORITY_META, tag colors, etc.
│   ├── hooks/
│   │   └── useLocalStorage.js
│   ├── components/
│   │   ├── Avatar.jsx
│   │   ├── PriorityBadge.jsx
│   │   ├── Modal.jsx
│   │   ├── FormField.jsx
│   │   ├── kanban/
│   │   │   ├── KanbanCard.jsx
│   │   │   ├── KanbanColumn.jsx
│   │   │   ├── CardModal.jsx     # View + edit card; Claude panel
│   │   │   ├── AddCardModal.jsx
│   │   │   └── ClaudePanel.jsx   # Real-time Claude Code output
│   │   └── overview/
│   │       ├── ProjectCard.jsx
│   │       ├── NewProjectModal.jsx
│   │       └── EditProjectModal.jsx
│   └── views/
│       ├── Overview.jsx
│       └── BoardView.jsx
│
└── server/
    ├── index.ts                  # Hono app entry, port 3001
    ├── drizzle.config.ts
    ├── db/
    │   ├── index.ts              # DB connection + auto-seed
    │   └── schema.ts             # projects, cards, settings tables
    ├── routes/
    │   ├── projects.ts           # CRUD /api/projects
    │   ├── cards.ts              # CRUD + Claude trigger /api/cards
    │   ├── events.ts             # SSE stream /api/events
    │   └── settings.ts           # Key-value settings /api/settings
    ├── hooks/
    │   ├── index.ts              # Typed EventEmitter + event types
    │   └── handlers/
    │       ├── index.ts          # Registers all hook handlers
    │       └── ai.ts             # Claude Code automation handlers
    ├── claude/
    │   └── runner.ts             # Spawns + manages Claude Code sessions
    └── types.ts
```

## API Routes

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
| POST | `/api/cards/:id/claude/abort` | Abort running Claude session |
| GET | `/api/events` | SSE stream for real-time updates |
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings/:key` | Upsert a setting |
| GET | `/health` | Health check |

## Claude Code Integration

Projects can have Claude Code enabled via the **project settings** (toggle + file path). When a card is moved to the **In Progress** column and the project has Claude enabled, the server automatically:

1. Builds a prompt from the card title, description, and project context
2. Spawns a Claude Code session pointed at the project directory
3. Streams output back to the frontend in real time via SSE

The **ClaudePanel** inside each card modal shows live output with styled segments: thinking blocks, tool calls, warnings, and response text. Sessions can be aborted mid-run or resumed with a follow-up prompt after completion.

## Database Schema

| Table | Key columns |
|-------|-------------|
| `projects` | id, name, description, color, members, dueDate, tag, claudeEnabled, projectPath |
| `cards` | id, projectId, columnId, title, priority, assignee, tags, due, description, position, claudeSessionId, claudeStatus, claudeNotes |
| `settings` | key, value |
