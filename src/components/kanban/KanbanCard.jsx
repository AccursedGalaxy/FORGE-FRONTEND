import { useState, useRef } from "react";
import { Avatar } from "../Avatar";
import { PriorityBadge } from "../PriorityBadge";
import { tagColor } from "../../utils/helpers";
import { useApp } from "../../context/AppContext";

export function KanbanCard({
  card, colId,
  onDragStart, onDragMove, onDragEnd,
  isDragOver, isDragging,
  onClick,
}) {
  const { claudeState, planState } = useApp();
  const claudeStatus = claudeState[card.id]?.status ?? card.claudeStatus ?? null;
  const planStatus = planState[card.id]?.status ?? card.planStatus ?? null;

  const [hover, setHover] = useState(false);
  const trackRef = useRef(null);
  const wasDragRef = useRef(false);

  function handlePointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    trackRef.current = { startX: e.clientX, startY: e.clientY, started: false };
    wasDragRef.current = false;
  }

  function handlePointerMove(e) {
    const t = trackRef.current;
    if (!t) return;
    if (!t.started) {
      if (Math.hypot(e.clientX - t.startX, e.clientY - t.startY) < 5) return;
      t.started = true;
      wasDragRef.current = true;
      onDragStart(e.clientX, e.clientY, e.currentTarget, card.id, colId);
    }
    onDragMove(e.clientX, e.clientY);
  }

  function handlePointerUp(e) {
    const t = trackRef.current;
    if (!t) return;
    trackRef.current = null;
    if (t.started) {
      onDragEnd(e.clientX, e.clientY);
    }
  }

  function handleClick() {
    if (wasDragRef.current) {
      wasDragRef.current = false;
      return;
    }
    onClick();
  }

  return (
    <div
      data-card-id={card.id}
      data-col-id={colId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
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
        cursor: isDragging ? "grabbing" : "grab",
        transition: isDragging ? "none" : "all 0.15s ease",
        opacity: isDragging ? 0.35 : 1,
        transform: isDragOver ? "translateY(-2px)" : "none",
        boxShadow: isDragOver
          ? "0 0 0 1px rgba(99,102,241,0.4), 0 8px 24px rgba(0,0,0,0.4)"
          : hover
          ? "0 4px 16px rgba(0,0,0,0.3)"
          : "none",
        backdropFilter: "blur(4px)",
        touchAction: "none",
        userSelect: "none",
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

      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 10 }}>
        <p
          style={{
            margin: 0,
            flex: 1,
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.9)",
            lineHeight: 1.5,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {card.title}
        </p>
        {colId === "todo" && planStatus === "running" && (
          <span title="Claude is planning this task…" style={{
            flexShrink: 0,
            marginTop: 3,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#34d399",
            boxShadow: "0 0 0 0 rgba(52,211,153,0.6)",
            animation: "claudePulse 1.4s ease-in-out infinite",
            display: "inline-block",
          }} />
        )}
        {colId === "todo" && planStatus === "done" && (
          <span title="Plan ready — open card to view" style={{
            flexShrink: 0,
            marginTop: 3,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#34d399",
            display: "inline-block",
            opacity: 0.6,
          }} />
        )}
        {colId === "todo" && planStatus === "error" && (
          <span title="Plan errored — open card to retry" style={{
            flexShrink: 0,
            marginTop: 3,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#f87171",
            display: "inline-block",
            opacity: 0.7,
          }} />
        )}
        {colId !== "todo" && claudeStatus === "running" && (
          <span title="Claude is working on this…" style={{
            flexShrink: 0,
            marginTop: 3,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#818cf8",
            boxShadow: "0 0 0 0 rgba(129,140,248,0.6)",
            animation: "claudePulse 1.4s ease-in-out infinite",
            display: "inline-block",
          }} />
        )}
        {colId !== "todo" && claudeStatus === "error" && (
          <span title="Claude errored — click to retry" style={{
            flexShrink: 0,
            marginTop: 3,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#f87171",
            display: "inline-block",
            opacity: 0.7,
          }} />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <PriorityBadge priority={card.priority} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {card.due && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
              {card.due}
            </span>
          )}
          {card.assignee && <Avatar initials={card.assignee} size={22} />}
        </div>
      </div>
    </div>
  );
}
