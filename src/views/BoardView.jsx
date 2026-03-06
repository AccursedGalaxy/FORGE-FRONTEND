import { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { KanbanColumn } from "../components/kanban/KanbanColumn";
import { CardModal } from "../components/kanban/CardModal";
import { AddCardModal } from "../components/kanban/AddCardModal";

export function BoardView({ projectId, onBack }) {
  const { projects, getBoard, boardsLoading, moveCard, addCard, updateCard, deleteCard } = useApp();
  const project = projects.find((p) => p.id === projectId);
  const board = getBoard(projectId);
  const isLoading = boardsLoading.has(projectId);

  const [selectedCard, setSelectedCard] = useState(null); // { card, colId }
  const [addingToCol, setAddingToCol] = useState(null);

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(null); // { cardId, colId }
  const [dragOver, setDragOver] = useState(null);  // card.id | "col:colId" | null
  const ghostRef = useRef(null);
  const dragRef = useRef(null); // { cardId, colId, offsetX, offsetY }

  function onDragStart(clientX, clientY, el, cardId, colId) {
    const rect = el.getBoundingClientRect();

    // Clone the card DOM node as a drag ghost
    const ghost = el.cloneNode(true);
    ghost.style.position = "fixed";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    ghost.style.width = rect.width + "px";
    ghost.style.margin = "0";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.opacity = "0.9";
    ghost.style.transform = "rotate(1.5deg) scale(1.03)";
    ghost.style.transition = "none";
    ghost.style.boxShadow = "0 20px 48px rgba(0,0,0,0.7)";
    document.body.appendChild(ghost);

    ghostRef.current = ghost;
    dragRef.current = {
      cardId,
      colId,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
    document.body.style.cursor = "grabbing";
    setDragging({ cardId, colId });
  }

  function onDragMove(clientX, clientY) {
    const ghost = ghostRef.current;
    const dr = dragRef.current;
    if (!ghost || !dr) return;

    ghost.style.left = (clientX - dr.offsetX) + "px";
    ghost.style.top = (clientY - dr.offsetY) + "px";

    // Hit-test under ghost (hide it momentarily so it doesn't block elementFromPoint)
    ghost.style.visibility = "hidden";
    const el = document.elementFromPoint(clientX, clientY);
    ghost.style.visibility = "";

    if (el) {
      const cardEl = el.closest("[data-card-id]");
      const colEl = el.closest("[data-col-id]");
      if (cardEl && cardEl.dataset.cardId !== dr.cardId) {
        setDragOver(cardEl.dataset.cardId);
      } else if (colEl) {
        setDragOver("col:" + colEl.dataset.colId);
      } else {
        setDragOver(null);
      }
    } else {
      setDragOver(null);
    }
  }

  function onDragEnd(clientX, clientY) {
    const ghost = ghostRef.current;
    const dr = dragRef.current;
    if (!ghost || !dr) return;

    ghost.style.visibility = "hidden";
    const el = document.elementFromPoint(clientX, clientY);
    ghost.remove();
    ghostRef.current = null;
    dragRef.current = null;
    document.body.style.cursor = "";

    if (el) {
      const cardEl = el.closest("[data-card-id]");
      const colEl = el.closest("[data-col-id]");

      if (cardEl && cardEl.dataset.cardId !== dr.cardId) {
        // Drop onto a specific card — insert before it
        moveCard(projectId, dr.cardId, dr.colId, cardEl.dataset.colId, cardEl.dataset.cardId);
      } else if (colEl) {
        // Drop onto column area — append to end
        const toColId = colEl.dataset.colId;
        moveCard(projectId, dr.cardId, dr.colId, toColId, null);
      }
    }

    setDragging(null);
    setDragOver(null);
  }

  // ── Card actions ──────────────────────────────────────────────────────────

  function handleAddCard(colId, cardData) {
    addCard(projectId, colId, cardData);
  }

  function handleUpdateCard(pid, cardId, changes) {
    updateCard(pid, cardId, changes);
    setSelectedCard((prev) =>
      prev ? { ...prev, card: { ...prev.card, ...changes } } : null
    );
  }

  function handleMoveCard(pid, cardId, fromColId, toColId) {
    moveCard(pid, cardId, fromColId, toColId, null);
    setSelectedCard((prev) => prev ? { ...prev, colId: toColId } : null);
  }

  function handleDeleteCard(pid, cardId) {
    deleteCard(pid, cardId);
    setSelectedCard(null);
  }

  const total = board ? board.columns.reduce((a, c) => a + c.cards.length, 0) : 0;

  const topBar = (
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
  );

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080910", display: "flex", flexDirection: "column" }}>
        {topBar}
        <div
          style={{
            flex: 1,
            overflowX: "auto",
            padding: "28px 32px",
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 260, flexShrink: 0 }}>
              <div className="skeleton" style={{ height: 28, borderRadius: 8, marginBottom: 12 }} />
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  className="skeleton"
                  style={{ height: 90, borderRadius: 10, marginBottom: 8 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080910", display: "flex", flexDirection: "column" }}>
      {topBar}

      {/* Board */}
      <div
        style={{
          flex: 1,
          overflowX: "auto",
          padding: "28px 32px",
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {(board?.columns ?? []).map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            dragOver={dragOver}
            draggingCardId={dragging?.cardId}
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
          onMove={handleMoveCard}
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
