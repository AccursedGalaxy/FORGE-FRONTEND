import { useState } from "react";
import { Modal } from "../Modal";
import { FormField, Input, Textarea, Select } from "../FormField";
import { tagColor } from "../../utils/helpers";

export function AddCardModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    title: "",
    priority: "medium",
    assignee: "",
    due: "",
    tags: [],
    description: "",
  });
  const [tagInput, setTagInput] = useState("");

  function handleTagKeyDown(e) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!form.tags.includes(tag)) {
        setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
      }
      setTagInput("");
    }
  }

  function removeTag(tag) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd(form);
    onClose();
  }

  return (
    <Modal onClose={onClose} title="New Card" width={460}>
      <form onSubmit={handleSubmit}>
        <FormField label="Title *">
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="What needs to be done?"
            autoFocus
            required
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="Priority">
            <Select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </FormField>
          <FormField label="Assignee">
            <Input
              value={form.assignee}
              onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
              placeholder="Initials (e.g. AK)"
              maxLength={3}
            />
          </FormField>
        </div>

        <FormField label="Due Date">
          <Input
            value={form.due}
            onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
            placeholder="e.g. Apr 30"
          />
        </FormField>

        <FormField label="Tags (press Enter to add)">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "6px 10px",
              minHeight: 38,
              alignItems: "center",
            }}
          >
            {form.tags.map((tag) => (
              <span
                key={tag}
                onClick={() => removeTag(tag)}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: tagColor(tag),
                  background: tagColor(tag) + "1a",
                  padding: "2px 6px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
                title="Click to remove"
              >
                {tag} ×
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag…"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "rgba(255,255,255,0.7)",
                fontSize: 12,
                flex: 1,
                minWidth: 80,
              }}
            />
          </div>
        </FormField>

        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional details…"
          />
        </FormField>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
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
              background: "#6366f1",
              border: "none",
              borderRadius: 8,
              padding: "7px 18px",
              cursor: "pointer",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Add Card
          </button>
        </div>
      </form>
    </Modal>
  );
}
