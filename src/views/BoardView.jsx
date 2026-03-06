import { useState } from "react";
import { useApp } from "../context/AppContext";
import { KanbanColumn } from "../components/kanban/KanbanColumn";
import { CardModal } from "../components/kanban/CardModal";
import { AddCardModal } from "../components/kanban/AddCardModal";

export function BoardView({ projectId, onBack }) {
  const { projects, getBoard, moveCard, addCard, updateCard, deleteCard } = useApp();
  const project = projects.find((p) => p.id === projectId);
  const board = getBoard(projectId);

  const [dragging, setDragging] = useState(null); // { cardId, colId }
  const [dragOver, setDragOver] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null); // { card, colId }
  const [addingToCol, setAddingToCol] = useState(null);

  function onDragStart(e, cardId, colId) {
    setDragging({ cardId, colId });
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e, type, targetCardId, targetColId) {
    if (type === "over") {
      setDragOver(targetCardId || targetColId);
      return;
    }
    if (!dragging) return;
    const { cardId, colId: fromColId } = dragging;
    if (cardId === targetCardId) return;
    moveCard(projectId, cardId, fromColId, targetColId, targetCardId);
    setDragging(null);
    setDragOver(null);
  }

  function handleAddCard(colId, cardData) {
    addCard(projectId, colId, cardData);
  }

  function handleUpdateCard(pid, cardId, changes) {
    updateCard(pid, cardId, changes);
    // Reflect changes in the selected card state immediately
    setSelectedCard((prev) =>
      prev ? { ...prev, card: { ...prev.card, ...changes } } : null
    );
  }

  function handleDeleteCard(pid, cardId) {
    deleteCard(pid, cardId);
    setSelectedCard(null);
  }

  const total = board.columns.reduce((a, c) => a + c.cards.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#080910", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 58,
          background: "rgba(8,9,16,0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          }}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "5px 12px",
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>←</span> Projects
        </button>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: project?.color || "#6366f1",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {project?.name || "Board"}
          </span>
        </div>

        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.25)",
            background: "rgba(255,255,255,0.05)",
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          {total} tasks
        </span>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setAddingToCol("todo")}
          style={{
            background: "#6366f1",
            border: "none",
            borderRadius: 8,
            padding: "6px 16px",
            cursor: "pointer",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          + Add Task
        </button>
      </div>

      {/* Board */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDragEnd={() => { setDragging(null); setDragOver(null); }}
        style={{
          flex: 1,
          overflowX: "auto",
          padding: "28px 32px",
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {board.columns.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            onDragStart={onDragStart}
            onDrop={onDrop}
            dragOverCard={dragOver}
            draggingCard={dragging?.cardId}
            onCardClick={(card, colId) => setSelectedCard({ card, colId })}
            onAddCard={(colId) => setAddingToCol(colId)}
          />
        ))}
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard.card}
          colId={selectedCard.colId}
          projectId={projectId}
          onClose={() => setSelectedCard(null)}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
        />
      )}

      {addingToCol && (
        <AddCardModal
          colId={addingToCol}
          onClose={() => setAddingToCol(null)}
          onAdd={(data) => handleAddCard(addingToCol, data)}
        />
      )}
    </div>
  );
}
