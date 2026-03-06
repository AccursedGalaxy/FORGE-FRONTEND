import { createContext, useContext, useState, useEffect, useRef } from "react";
import { DEFAULT_COLUMNS } from "../data/initialData";

const AppContext = createContext(null);

// ── API helpers ───────────────────────────────────────────────────────────────

const api = {
  get: (url) => fetch(url).then((r) => r.json()),
  post: (url, body) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
  patch: (url, body) =>
    fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()),
  del: (url) => fetch(url, { method: "DELETE" }).then((r) => r.json()),
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [boards, setBoards] = useState({});
  const [loading, setLoading] = useState(true);

  // Track which boards are currently being fetched to avoid duplicate requests
  const boardLoadingRef = useRef(new Set());

  // ── Initial load + SSE ───────────────────────────────────────────────────

  useEffect(() => {
    api.get("/api/projects").then((data) => {
      setProjects(data);
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

  function handleSSEEvent(type, data) {
    switch (type) {
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
                cards: col.cards.map((c) => (c.id === data.card.id ? { ...c, ...data.card } : c)),
              })),
            },
          };
        });
        break;

      case "project:updated":
        setProjects((prev) =>
          prev.map((p) => (p.id === data.project.id ? { ...p, ...data.project } : p))
        );
        break;

      default:
        break;
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

  // ── Projects ─────────────────────────────────────────────────────────────

  async function addProject(data) {
    const project = await api.post("/api/projects", data);
    setProjects((prev) => [...prev, project]);
    setBoards((prev) => ({
      ...prev,
      [project.id]: { columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })) },
    }));
    return project.id;
  }

  async function updateProject(id, changes) {
    const project = await api.patch(`/api/projects/${id}`, changes);
    setProjects((prev) => prev.map((p) => (p.id === id ? project : p)));
  }

  async function deleteProject(id) {
    await api.del(`/api/projects/${id}`);
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
      api.get(`/api/projects/${projectId}/board`).then((data) => {
        setBoards((prev) => ({ ...prev, [projectId]: data }));
        boardLoadingRef.current.delete(projectId);
      });
    }
    return boards[projectId] || { columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })) };
  }

  async function moveCard(projectId, cardId, fromColId, toColId, targetCardId) {
    // Optimistic update
    setBoards((prev) => {
      const board = prev[projectId];
      if (!board) return prev;
      const cols = board.columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const fromCol = cols.find((c) => c.id === fromColId);
      const toCol = cols.find((c) => c.id === toColId);
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

    // Persist to DB
    await api.post(`/api/cards/${cardId}/move`, { toColId, targetCardId });
  }

  async function addCard(projectId, colId, cardData) {
    const card = await api.post(`/api/projects/${projectId}/cards`, { colId, ...cardData });
    setBoards((prev) => {
      const board = prev[projectId] || { columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })) };
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
    await api.patch(`/api/cards/${cardId}`, changes);
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
    await api.del(`/api/cards/${cardId}`);
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
    getBoard,
    addProject,
    updateProject,
    deleteProject,
    moveCard,
    addCard,
    updateCard,
    deleteCard,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
