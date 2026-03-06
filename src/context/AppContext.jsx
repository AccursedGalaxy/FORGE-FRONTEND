import { createContext, useContext, useState, useEffect, useRef } from "react";
import { DEFAULT_COLUMNS } from "../data/initialData";
import { useToast } from "../components/Toast";

const AppContext = createContext(null);

// ── API helpers ───────────────────────────────────────────────────────────────

const api = {
  get: (url) =>
    fetch(url).then((r) => {
      if (!r.ok) throw new Error(r.statusText || `GET ${url} failed`);
      return r.json();
    }),
  post: (url, body) =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText || `POST ${url} failed`);
      return r.json();
    }),
  patch: (url, body) =>
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => {
      if (!r.ok) throw new Error(r.statusText || `PATCH ${url} failed`);
      return r.json();
    }),
  del: (url) =>
    fetch(url, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error(r.statusText || `DELETE ${url} failed`);
      return r.json();
    }),
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const { showError } = useToast();

  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState({});
  const [loading, setLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(new Set());
  // claudeState: { [cardId]: { status, chunks, sessionId } }
  const [claudeState, setClaudeState] = useState({});
  // planState: { [cardId]: { status, chunks, sessionId } }
  const [planState, setPlanState] = useState({});

  // Ref guards duplicate in-flight board fetches (state updates are async)
  const boardLoadingRef = useRef(new Set());

  // ── Safe API wrapper ──────────────────────────────────────────────────────

  async function safeApi(fn, fallback = null) {
    try {
      return await fn();
    } catch (err) {
      showError(err.message || "Request failed");
      return fallback;
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _syncStats(projectId, updatedBoard) {
    const counts = { todo: 0, inProgress: 0, review: 0, done: 0 };
    for (const col of updatedBoard.columns) {
      if (col.id in counts) counts[col.id] = col.cards.length;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const progress = total === 0 ? 0 : Math.round((counts.done / total) * 100);
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, tasks: counts, progress } : p))
    );
  }

  // ── Initial load + SSE ───────────────────────────────────────────────────

  function handleSSEEvent(type, data) {
    switch (type) {
      case "task:created":
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          // Skip if this tab already added it via addCard (optimistic write)
          const exists = board.columns.some((col) =>
            col.cards.some((c) => c.id === data.card.id)
          );
          if (exists) return prev;
          const updated = {
            ...board,
            columns: board.columns.map((col) =>
              col.id === data.colId
                ? { ...col, cards: [...col.cards, data.card] }
                : col
            ),
          };
          _syncStats(data.projectId, updated);
          return { ...prev, [data.projectId]: updated };
        });
        break;

      case "task:moved":
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          const cols = board.columns.map((c) => ({ ...c, cards: [...c.cards] }));
          const fromCol = cols.find((c) => c.id === data.fromColId);
          const toCol   = cols.find((c) => c.id === data.toColId);
          if (!fromCol || !toCol) return prev;
          const idx = fromCol.cards.findIndex((c) => c.id === data.card.id);
          if (idx === -1) return prev;
          const [card] = fromCol.cards.splice(idx, 1);
          toCol.cards.push(card);
          const updated = { ...board, columns: cols };
          _syncStats(data.projectId, updated);
          return { ...prev, [data.projectId]: updated };
        });
        break;

      case "task:updated":
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          return {
            ...prev,
            [data.projectId]: {
              ...board,
              columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id === data.card.id ? { ...c, ...data.card } : c
                ),
              })),
            },
          };
        });
        break;

      case "task:deleted":
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          const updated = {
            ...board,
            columns: board.columns.map((col) => ({
              ...col,
              cards: col.cards.filter((c) => c.id !== data.cardId),
            })),
          };
          _syncStats(data.projectId, updated);
          return { ...prev, [data.projectId]: updated };
        });
        break;

      case "project:created":
        setProjects((prev) =>
          prev.some((p) => p.id === data.project.id) ? prev : [...prev, data.project]
        );
        break;

      case "project:updated":
        setProjects((prev) =>
          prev.map((p) => (p.id === data.project.id ? { ...p, ...data.project } : p))
        );
        break;

      case "project:deleted":
        setProjects((prev) => prev.filter((p) => p.id !== data.projectId));
        setBoards((prev) => {
          const next = { ...prev };
          delete next[data.projectId];
          return next;
        });
        break;

      case "claude:start":
        setClaudeState((prev) => ({
          ...prev,
          [data.cardId]: {
            status: "running",
            chunks: prev[data.cardId]?.chunks ?? [],
            sessionId: data.sessionId ?? prev[data.cardId]?.sessionId ?? null,
          },
        }));
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          return {
            ...prev,
            [data.projectId]: {
              ...board,
              columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id !== data.cardId ? c : { ...c, claudeStatus: "running" }
                ),
              })),
            },
          };
        });
        break;

      case "claude:stream":
        setClaudeState((prev) => {
          const entry = prev[data.cardId] ?? { status: "running", chunks: [], sessionId: null };
          return { ...prev, [data.cardId]: { ...entry, chunks: [...entry.chunks, data.chunk] } };
        });
        break;

      case "claude:done":
        setClaudeState((prev) => ({
          ...prev,
          [data.cardId]: {
            ...prev[data.cardId],
            status: "done",
            sessionId: data.sessionId ?? prev[data.cardId]?.sessionId ?? null,
          },
        }));
        // Update claudeNotes on the card (description is untouched)
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          return {
            ...prev,
            [data.projectId]: {
              ...board,
              columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id !== data.cardId ? c : { ...c, claudeStatus: "done", claudeNotes: data.notes }
                ),
              })),
            },
          };
        });
        break;

      case "claude:error":
        setClaudeState((prev) => ({
          ...prev,
          [data.cardId]: { ...prev[data.cardId], status: "error" },
        }));
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          return {
            ...prev,
            [data.projectId]: {
              ...board,
              columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id !== data.cardId ? c : { ...c, claudeStatus: "error" }
                ),
              })),
            },
          };
        });
        break;

      case "plan:start":
        setPlanState((prev) => ({
          ...prev,
          [data.cardId]: {
            status: "running",
            chunks: [],
            sessionId: data.sessionId ?? prev[data.cardId]?.sessionId ?? null,
          },
        }));
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          return {
            ...prev,
            [data.projectId]: {
              ...board,
              columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id !== data.cardId ? c : { ...c, planStatus: "running" }
                ),
              })),
            },
          };
        });
        break;

      case "plan:stream":
        setPlanState((prev) => {
          const entry = prev[data.cardId] ?? { status: "running", chunks: [], sessionId: null };
          return { ...prev, [data.cardId]: { ...entry, chunks: [...entry.chunks, data.chunk] } };
        });
        break;

      case "plan:done":
        setPlanState((prev) => ({
          ...prev,
          [data.cardId]: {
            ...prev[data.cardId],
            status: "done",
            chunks: [],
            sessionId: data.sessionId ?? prev[data.cardId]?.sessionId ?? null,
          },
        }));
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          return {
            ...prev,
            [data.projectId]: {
              ...board,
              columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id !== data.cardId ? c : { ...c, planStatus: "done", planContent: data.planContent, planSessionId: data.sessionId }
                ),
              })),
            },
          };
        });
        break;

      case "plan:error":
        setPlanState((prev) => ({
          ...prev,
          [data.cardId]: { ...prev[data.cardId], status: "error" },
        }));
        setBoards((prev) => {
          const board = prev[data.projectId];
          if (!board) return prev;
          return {
            ...prev,
            [data.projectId]: {
              ...board,
              columns: board.columns.map((col) => ({
                ...col,
                cards: col.cards.map((c) =>
                  c.id !== data.cardId ? c : { ...c, planStatus: "error" }
                ),
              })),
            },
          };
        });
        break;

      default:
        break;
    }
  }

  useEffect(() => {
    api
      .get("/api/projects")
      .then((data) => {
        setProjects(data);
        setLoading(false);
      })
      .catch((err) => {
        showError(err.message || "Failed to load projects");
        setLoading(false);
      });

    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      const { type, data } = JSON.parse(e.data);
      handleSSEEvent(type, data);
    };
    es.onerror = () => console.warn("[sse] connection error");

    return () => es.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Projects ─────────────────────────────────────────────────────────────

  async function addProject(data) {
    const project = await safeApi(() => api.post("/api/projects", data));
    if (!project) return null;
    setProjects((prev) => prev.some((p) => p.id === project.id) ? prev : [...prev, project]);
    setBoards((prev) => ({
      ...prev,
      [project.id]: { columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })) },
    }));
    return project.id;
  }

  async function updateProject(id, changes) {
    const project = await safeApi(() => api.patch(`/api/projects/${id}`, changes));
    if (!project) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
  }

  async function getProjectDocs(id) {
    return safeApi(() => api.get(`/api/projects/${id}/docs`));
  }

  async function saveProjectDocs(id, { readme, spec }) {
    return safeApi(() => api.patch(`/api/projects/${id}/docs`, { readme, spec }));
  }

  async function deleteProject(id) {
    const result = await safeApi(() => api.del(`/api/projects/${id}`));
    if (result === null) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setBoards((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // ── Boards / Cards ────────────────────────────────────────────────────────

  function getBoard(projectId) {
    if (!boards[projectId] && !boardLoadingRef.current.has(projectId)) {
      boardLoadingRef.current.add(projectId);
      setBoardsLoading((prev) => new Set([...prev, projectId]));
      api
        .get(`/api/projects/${projectId}/board`)
        .then((data) => {
          setBoards((prev) => ({ ...prev, [projectId]: data }));
          boardLoadingRef.current.delete(projectId);
          setBoardsLoading((prev) => {
            const next = new Set(prev);
            next.delete(projectId);
            return next;
          });
        })
        .catch((err) => {
          showError(err.message || "Failed to load board");
          boardLoadingRef.current.delete(projectId);
          setBoardsLoading((prev) => {
            const next = new Set(prev);
            next.delete(projectId);
            return next;
          });
        });
    }
    return boards[projectId] || null;
  }

  async function moveCard(projectId, cardId, fromColId, toColId, targetCardId) {
    // Capture snapshot for rollback
    let snapshot;
    setBoards((prev) => {
      snapshot = prev;
      const board = prev[projectId];
      if (!board) return prev;
      const cols = board.columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const fromCol = cols.find((c) => c.id === fromColId);
      const toCol   = cols.find((c) => c.id === toColId);
      if (!fromCol || !toCol) return prev;
      const idx = fromCol.cards.findIndex((c) => c.id === cardId);
      if (idx === -1) return prev;
      const [card] = fromCol.cards.splice(idx, 1);
      if (targetCardId) {
        const targetIdx = toCol.cards.findIndex((c) => c.id === targetCardId);
        toCol.cards.splice(targetIdx, 0, card);
      } else {
        toCol.cards.push(card);
      }
      const updated = { ...board, columns: cols };
      _syncStats(projectId, updated);
      return { ...prev, [projectId]: updated };
    });

    try {
      await api.post(`/api/cards/${cardId}/move`, { toColId, targetCardId });
    } catch (err) {
      showError(err.message || "Failed to move card");
      if (snapshot) {
        setBoards(snapshot);
        if (snapshot[projectId]) _syncStats(projectId, snapshot[projectId]);
      }
    }
  }

  async function addCard(projectId, colId, cardData) {
    const card = await safeApi(() =>
      api.post(`/api/projects/${projectId}/cards`, { colId, ...cardData })
    );
    if (!card) return null;
    setBoards((prev) => {
      const board = prev[projectId] || { columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })) };
      // SSE task:created may have already added this card if it arrived before the POST resolved
      const exists = board.columns.some((col) => col.cards.some((c) => c.id === card.id));
      if (exists) return prev;
      const updated = {
        ...board,
        columns: board.columns.map((c) =>
          c.id === colId ? { ...c, cards: [...c.cards, card] } : c
        ),
      };
      _syncStats(projectId, updated);
      return { ...prev, [projectId]: updated };
    });
    return card.id;
  }

  async function updateCard(projectId, cardId, changes) {
    const result = await safeApi(() => api.patch(`/api/cards/${cardId}`, changes));
    if (result === null) return;
    setBoards((prev) => {
      const board = prev[projectId];
      if (!board) return prev;
      return {
        ...prev,
        [projectId]: {
          ...board,
          columns: board.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...changes } : c)),
          })),
        },
      };
    });
  }

  async function deleteCard(projectId, cardId) {
    const result = await safeApi(() => api.del(`/api/cards/${cardId}`));
    if (result === null) return;
    setBoards((prev) => {
      const board = prev[projectId];
      if (!board) return prev;
      const updated = {
        ...board,
        columns: board.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => c.id !== cardId),
        })),
      };
      _syncStats(projectId, updated);
      return { ...prev, [projectId]: updated };
    });
  }

  const value = {
    projects,
    boards,
    loading,
    boardsLoading,
    claudeState,
    planState,
    getBoard,
    addProject,
    updateProject,
    deleteProject,
    getProjectDocs,
    saveProjectDocs,
    moveCard,
    addCard,
    updateCard,
    deleteCard,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
