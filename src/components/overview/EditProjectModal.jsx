import { useState } from "react";
import { Modal } from "../Modal";
import { FormField, Input, Textarea } from "../FormField";

const PRESET_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ec4899",
  "#06b6d4", "#8b5cf6", "#ef4444", "#f97316",
];

export function EditProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description || "",
    color: project.color,
    tag: project.tag || "",
    dueDate: project.dueDate || "",
    members: project.members.join(", "),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      members: form.members
        .split(",")
        .map((m) => m.trim().toUpperCase())
        .filter(Boolean)
        .slice(0, 6),
    });
    onClose();
  }

  return (
    <Modal onClose={onClose} title="Edit Project" width={480}>
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
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
}
