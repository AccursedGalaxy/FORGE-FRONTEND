import { createContext, useContext } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { INITIAL_PROJECTS, INITIAL_BOARDS, DEFAULT_COLUMNS } from "../data/initialData";
import { generateId, deriveTaskCounts, deriveProgress } from "../utils/helpers";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [projects, setProjects] = useLocalStorage("kairos:projects", INITIAL_PROJECTS);
  const [boards, setBoards] = useLocalStorage("kairos:boards", INITIAL_BOARDS);

  // ── Projects ──────────────────────────────────────────────────────────────

  function addProject(data) {
    const id = generateId("p");
    const newProject = {
      id,
      name: data.name,
      description: data.description || "",
      color: data.color || "#6366f1",
      progress: 0,
      tasks: { todo: 0, inProgress: 0, review: 0, done: 0 },
      members: data.members || [],
      dueDate: data.dueDate || "",
      tag: data.tag || "General",
    };
    setProjects((prev) => [...prev, newProject]);
    setBoards((prev) => ({
      ...prev,
      [id]: { columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })) },
    }));
    return id;
  }

  function updateProject(id, changes) {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    );
  }

  function deleteProject(id) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setBoards((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // ── Boards / Cards ────────────────────────────────────────────────────────

  function getBoard(projectId) {
    return (
      boards[projectId] || {
        columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })),
      }
    );
  }

  function _syncProjectStats(projectId, updatedBoard) {
    const counts = deriveTaskCounts(updatedBoard);
    const progress = deriveProgress(counts);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, tasks: counts, progress } : p
      )
    );
  }

  function moveCard(projectId, cardId, fromColId, toColId, targetCardId) {
    setBoards((prev) => {
      const board = prev[projectId];
      if (!board) return prev;
      const cols = board.columns.map((c) => ({ ...c, cards: [...c.cards] }));
      const fromCol = cols.find((c) => c.id === fromColId);
      const toCol = cols.find((c) => c.id === toColId);
      if (!fromCol || !toCol) return prev;
      const cardIdx = fromCol.cards.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return prev;
      const [card] = fromCol.cards.splice(cardIdx, 1);
      if (targetCardId) {
        const targetIdx = toCol.cards.findIndex((c) => c.id === targetCardId);
        toCol.cards.splice(targetIdx, 0, card);
      } else {
        toCol.cards.push(card);
      }
      const updated = { ...board, columns: cols };
      _syncProjectStats(projectId, updated);
      return { ...prev, [projectId]: updated };
    });
  }

  function addCard(projectId, colId, cardData) {
    const newCard = {
      id: generateId("c"),
      title: cardData.title,
      priority: cardData.priority || "medium",
      assignee: cardData.assignee || "",
      tags: cardData.tags || [],
      due: cardData.due || "",
      description: cardData.description || "",
    };
    setBoards((prev) => {
      const board = prev[projectId] || { columns: DEFAULT_COLUMNS.map((c) => ({ ...c, cards: [] })) };
      const updated = {
        ...board,
        columns: board.columns.map((c) =>
          c.id === colId ? { ...c, cards: [...c.cards, newCard] } : c
        ),
      };
      _syncProjectStats(projectId, updated);
      return { ...prev, [projectId]: updated };
    });
    return newCard.id;
  }

  function updateCard(projectId, cardId, changes) {
    setBoards((prev) => {
      const board = prev[projectId];
      if (!board) return prev;
      const updated = {
        ...board,
        columns: board.columns.map((col) => ({
          ...col,
          cards: col.cards.map((c) => (c.id === cardId ? { ...c, ...changes } : c)),
        })),
      };
      return { ...prev, [projectId]: updated };
    });
  }

  function deleteCard(projectId, cardId) {
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
      _syncProjectStats(projectId, updated);
      return { ...prev, [projectId]: updated };
    });
  }

  const value = {
    projects,
    boards,
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
