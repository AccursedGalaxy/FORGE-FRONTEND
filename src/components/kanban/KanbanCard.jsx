import { useState } from "react";
import { Avatar } from "../Avatar";
import { PriorityBadge } from "../PriorityBadge";
import { tagColor } from "../../utils/helpers";

export function KanbanCard({ card, colId, onDragStart, onDrop, isDragOver, isDragging, onClick }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id, colId)}
      onDragOver={(e) => { e.preventDefault(); onDrop(e, "over", card.id, colId); }}
      onDrop={(e) => onDrop(e, "drop", card.id, colId)}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: isDragOver
          ? "1px solid rgba(99,102,241,0.7)"
          : hover
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "13px 14px",
        cursor: "grab",
        transition: "all 0.15s ease",
        opacity: isDragging ? 0.4 : 1,
        transform: isDragOver ? "translateY(-2px)" : "none",
        boxShadow: isDragOver
          ? "0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(0,0,0,0.4)"
          : hover
          ? "0 4px 16px rgba(0,0,0,0.3)"
          : "none",
        backdropFilter: "blur(4px)",
      }}
    >
      {card.tags?.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {card.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: tagColor(tag),
                background: tagColor(tag) + "1a",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p
        style={{
          margin: 0,
          marginBottom: 10,
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(255,255,255,0.9)",
          lineHeight: 1.5,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {card.title}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <PriorityBadge priority={card.priority} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {card.due && (
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {card.due}
            </span>
          )}
          {card.assignee && <Avatar initials={card.assignee} size={22} />}
        </div>
      </div>
    </div>
  );
}
