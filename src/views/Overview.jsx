import { useState } from "react";
import { useApp } from "../context/AppContext";
import { ProjectCard } from "../components/overview/ProjectCard";
import { NewProjectModal } from "../components/overview/NewProjectModal";
import { Avatar } from "../components/Avatar";

export function Overview({ onOpenProject }) {
  const { projects, addProject } = useApp();
  const [filter, setFilter] = useState("All");
  const [showNewProject, setShowNewProject] = useState(false);

  const tags = ["All", ...new Set(projects.map((p) => p.tag).filter(Boolean))];
  const filtered = filter === "All" ? projects : projects.filter((p) => p.tag === filter);

  const totalTasks = projects.flatMap((p) => Object.values(p.tasks)).reduce((a, b) => a + b, 0);
  const doneTasks = projects.reduce((a, p) => a + p.tasks.done, 0);
  const inProgress = projects.reduce((a, p) => a + p.tasks.inProgress, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#080910" }}>
      {/* Nav */}
      <nav
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "0 40px",
          height: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(8,9,16,0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.5" fill="white" fillOpacity=".9" />
              <rect x="8" y="1" width="5" height="5" rx="1.5" fill="white" fillOpacity=".5" />
              <rect x="1" y="8" width="5" height="5" rx="1.5" fill="white" fillOpacity=".5" />
              <rect x="8" y="8" width="5" height="5" rx="1.5" fill="white" fillOpacity=".9" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "rgba(255,255,255,0.92)",
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Kairos
          </span>
        </div>
        <Avatar initials="RB" size={30} color="#6366f1" />
      </nav>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              margin: "0 0 6px",
              fontSize: 30,
              fontWeight: 800,
              color: "rgba(255,255,255,0.95)",
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            Projects
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            {projects.length} active · {doneTasks}/{totalTasks} tasks complete
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
            marginBottom: 40,
          }}
        >
          {[
            ["Projects", projects.length, "#6366f1"],
            ["Total Tasks", totalTasks, "#10b981"],
            ["In Progress", inProgress, "#f59e0b"],
            ["Completed", doneTasks, "#ec4899"],
          ].map(([label, val, color]) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color,
                  fontFamily: "'DM Mono', monospace",
                  marginBottom: 4,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Filter tabs + New Project */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                background: filter === t ? "rgba(99,102,241,0.2)" : "transparent",
                border:
                  filter === t
                    ? "1px solid rgba(99,102,241,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "5px 14px",
                cursor: "pointer",
                color: filter === t ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                transition: "all 0.15s",
              }}
            >
              {t}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setShowNewProject(true)}
            style={{
              background: "#6366f1",
              border: "none",
              borderRadius: 8,
              padding: "6px 18px",
              cursor: "pointer",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
            }}
          >
            + New Project
          </button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "rgba(255,255,255,0.2)",
              fontSize: 14,
            }}
          >
            No projects yet.{" "}
            <span
              onClick={() => setShowNewProject(true)}
              style={{ color: "#6366f1", cursor: "pointer" }}
            >
              Create one
            </span>
            .
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
              gap: 16,
            }}
          >
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onClick={() => onOpenProject(p.id)} />
            ))}
          </div>
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onAdd={addProject}
        />
      )}
    </div>
  );
}
