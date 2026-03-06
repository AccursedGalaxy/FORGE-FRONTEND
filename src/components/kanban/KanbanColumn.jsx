import { useState } from "react";
import { KanbanCard } from "./KanbanCard";
import { COL_ACCENTS } from "../../utils/helpers";

export function KanbanColumn({ col, onDragStart, onDrop, dragOverCard, draggingCard, onCardClick, onAddCard }) {
  const [hover, setHover] = useState(false);
  const accent = COL_ACCENTS[col.id] || "#6366f1";

  return (
    <div style={{ width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 2px 14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accent,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {col.title}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.3)",
              padding: "1px 7px",
              borderRadius: 20,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {col.cards.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(col.id)}
          onMouseEnter={(e) => (e.target.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={(e) => (e.target.style.color = "rgba(255,255,255,0.25)")}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.25)",
            fontSize: 18,
            lineHeight: 1,
            padding: "0 2px",
            transition: "color 0.15s",
          }}
        >
          +
        </button>
      </div>

      {/* Cards */}
      <div
        onDragOver={(e) => { e.preventDefault(); onDrop(e, "over", null, col.id); }}
        onDrop={(e) => onDrop(e, "drop", null, col.id)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minHeight: 80,
          borderRadius: 12,
          transition: "background 0.15s",
        }}
      >
        {col.cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            colId={col.id}
            onDragStart={onDragStart}
            onDrop={onDrop}
            isDragOver={dragOverCard === card.id}
            isDragging={draggingCard === card.id}
            onClick={() => onCardClick(card, col.id)}
          />
        ))}
        {col.cards.length === 0 && (
          <div
            style={{
              border: "1px dashed rgba(255,255,255,0.07)",
              borderRadius: 10,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.2)",
              fontSize: 12,
            }}
          >
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
