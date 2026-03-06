import { useState, useEffect, useRef } from "react";
import { Avatar } from "../Avatar";

const menuItemStyle = {
  display: "block",
  width: "100%",
  background: "transparent",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
  color: "rgba(255,255,255,0.7)",
  fontSize: 12,
  fontWeight: 600,
  textAlign: "left",
  transition: "background 0.1s",
};

export function ProjectCard({ project, onClick, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(false);
  const menuRef = useRef(null);
  const total = Object.values(project.tasks).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setDeleteStep(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); }}
      style={{
        position: "relative",
        transition: "all 0.2s ease",
        transform: hover ? "translateY(-2px)" : "none",
        borderRadius: 14,
      }}
    >
      {/* Kebab menu button */}
      <div
        ref={menuRef}
        style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
            setDeleteStep(false);
          }}
          style={{
            background: menuOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.0)",
            border: "none",
            borderRadius: 6,
            width: 28,
            height: 28,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hover || menuOpen ? 1 : 0,
            transition: "opacity 0.15s, background 0.15s",
            color: "rgba(255,255,255,0.6)",
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ···
        </button>
        {menuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: 32,
              right: 0,
              background: "#1a1b26",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: 6,
              minWidth: deleteStep ? 150 : 120,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              zIndex: 20,
            }}
          >
            {!deleteStep ? (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit(project);
                  }}
                  style={menuItemStyle}
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteStep(true);
                  }}
                  style={{ ...menuItemStyle, color: "#ef4444" }}
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    padding: "4px 8px 6px",
                    fontWeight: 600,
                  }}
                >
                  Are you sure?
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setDeleteStep(false);
                    onDelete(project.id);
                  }}
                  style={{ ...menuItemStyle, color: "#ef4444", fontWeight: 700 }}
                >
                  Yes, Delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteStep(false);
                  }}
                  style={menuItemStyle}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {/* Inner card — overflow:hidden clips the accent line to rounded corners */}
      <div
        onClick={onClick}
        style={{
          background: hover ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.025)",
          border: hover
            ? `1px solid ${project.color}55`
            : "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: "22px 24px",
          cursor: "pointer",
          boxShadow: hover
            ? `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${project.color}22`
            : "none",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
        }}
      >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${project.color}, transparent)`,
          opacity: hover ? 1 : 0.5,
          transition: "opacity 0.2s",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: project.color,
              background: project.color + "1a",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {project.tag}
          </span>
          <h3
            style={{
              margin: "8px 0 0",
              fontSize: 16,
              fontWeight: 700,
              color: "rgba(255,255,255,0.92)",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {project.name}
          </h3>
        </div>
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "'DM Mono', monospace",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {project.dueDate ? `Due ${project.dueDate}` : "No due date"}
        </span>
      </div>

      <p
        style={{
          margin: "0 0 18px",
          fontSize: 12.5,
          color: "rgba(255,255,255,0.42)",
          lineHeight: 1.6,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {project.description || "No description."}
      </p>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.3)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Progress
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: project.color,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {project.progress}%
          </span>
        </div>
        <div
          style={{
            height: 3,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${project.progress}%`,
              background: `linear-gradient(90deg,${project.color}99,${project.color})`,
              borderRadius: 2,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* Task breakdown */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        {[
          ["Backlog", project.tasks.todo, "rgba(255,255,255,0.25)"],
          ["Active", project.tasks.inProgress, project.color],
          ["Review", project.tasks.review, "#f59e0b"],
          ["Done", project.tasks.done, "#10b981"],
        ].map(([label, count, color]) => (
          <div key={label} style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {count}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.25)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          {project.members.map((m, i) => (
            <div key={m} style={{ marginLeft: i === 0 ? 0 : -8 }}>
              <Avatar initials={m} size={26} />
            </div>
          ))}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {total} tasks
        </span>
      </div>
      </div>
    </div>
  );
}
