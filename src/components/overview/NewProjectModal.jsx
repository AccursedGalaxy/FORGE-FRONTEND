import { useState } from "react";
import { Modal } from "../Modal";
import { FormField, Input, Textarea } from "../FormField";

const PRESET_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899",
  "#06b6d4", "#8b5cf6", "#ef4444", "#f97316",
];

export function NewProjectModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    tag: "",
    dueDate: "",
    members: "",
    claudeEnabled: false,
    projectPath: "",
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({
      ...form,
      members: form.members
        .split(",")
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 6),
      claudeEnabled: form.claudeEnabled,
      projectPath: form.claudeEnabled ? form.projectPath : "",
    });
    onClose();
  }

  return (
    <Modal onClose={onClose} title="New Project" width={480}>
      <form onSubmit={handleSubmit}>
        <FormField label="Project Name *">
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Marketing Site Revamp"
            autoFocus
            required
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What is this project about?"
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Tag / Category">
            <Input
              value={form.tag}
              onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
              placeholder="e.g. Design"
            />
          </FormField>
          <FormField label="Due Date">
            <Input
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              placeholder="e.g. Jun 30"
            />
          </FormField>
        </div>

        <FormField label="Members (initials, comma-separated)">
          <Input
            value={form.members}
            onChange={(e) => setForm((f) => ({ ...f, members: e.target.value }))}
            placeholder="e.g. AK, JR, MS"
          />
        </FormField>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.claudeEnabled ? 12 : 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
              Claude Code
            </span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, claudeEnabled: !f.claudeEnabled }))}
              style={{
                background: form.claudeEnabled ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${form.claudeEnabled ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 20,
                padding: "4px 12px",
                cursor: "pointer",
                color: form.claudeEnabled ? "#818cf8" : "rgba(255,255,255,0.4)",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {form.claudeEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>
          {form.claudeEnabled && (
            <div style={{ marginTop: 0 }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>
                Project Path
              </p>
              <input
                value={form.projectPath}
                onChange={(e) => setForm((f) => ({ ...f, projectPath: e.target.value }))}
                placeholder="/home/user/my-project"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 12,
                  fontFamily: "'DM Mono', monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>

        <FormField label="Color">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border: form.color === c
                    ? "3px solid #fff"
                    : "2px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  padding: 0,
                  transition: "border 0.1s",
                }}
              />
            ))}
          </div>
        </FormField>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "7px 16px",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              background: form.color,
              border: "none",
              borderRadius: 8,
              padding: "7px 18px",
              cursor: "pointer",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
}
