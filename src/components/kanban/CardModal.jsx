import { useState } from "react";
import { Modal } from "../Modal";
import { FormField, Input, Textarea, Select } from "../FormField";
import { Avatar } from "../Avatar";
import { PriorityBadge } from "../PriorityBadge";
import { tagColor } from "../../utils/helpers";
import { ClaudePanel } from "./ClaudePanel";

const COL_LABELS = {
  todo: "Backlog",
  inProgress: "In Progress",
  review: "In Review",
  done: "Done",
};

export function CardModal({ card, colId, projectId, project, onClose, onUpdate, onMove, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...card, colId });

  function handleSave() {
    const { colId: newColId, ...cardChanges } = form;
    onUpdate(projectId, card.id, cardChanges);
    if (newColId !== colId) {
      onMove(projectId, card.id, colId, newColId);
    }
    setEditing(false);
  }

  function handleTagInput(e) {
    if (e.key === "Enter" && e.target.value.trim()) {
      const tag = e.target.value.trim().toLowerCase();
      if (!form.tags.includes(tag)) {
        setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
      }
      e.target.value = "";
      e.preventDefault();
    }
  }

  function removeTag(tag) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  if (!card) return null;

  return (
    <Modal onClose={onClose} width={520}>
      {/* Tags row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {card.tags?.map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: tagColor(tag),
              background: tagColor(tag) + "1a",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {editing ? (
        /* Edit form */
        <div>
          <FormField label="Title">
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Status">
              <Select
                value={form.colId}
                onChange={(e) => setForm((f) => ({ ...f, colId: e.target.value }))}
              >
                <option value="todo">Backlog</option>
                <option value="inProgress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
              </Select>
            </FormField>
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
          </div>

          <FormField label="Assignee">
            <Input
              value={form.assignee}
              onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
              placeholder="Initials"
              maxLength={3}
            />
          </FormField>

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
                onKeyDown={handleTagInput}
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
              placeholder="Add a description…"
            />
          </FormField>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button
              onClick={() => setEditing(false)}
              style={ghostBtn}
            >
              Cancel
            </button>
            <button onClick={handleSave} style={primaryBtn}>
              Save
            </button>
          </div>
        </div>
      ) : (
        /* View mode */
        <div>
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              fontFamily: "'Syne', sans-serif",
              lineHeight: 1.4,
            }}
          >
            {card.title}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              [
                "Status",
                <span key="s" style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "'DM Sans', sans-serif" }}>
                  {COL_LABELS[colId] || colId}
                </span>,
              ],
              [
                "Priority",
                <PriorityBadge key="p" priority={card.priority} />,
              ],
              [
                "Assignee",
                card.assignee ? (
                  <div key="a" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar initials={card.assignee} size={20} />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                      {card.assignee}
                    </span>
                  </div>
                ) : (
                  <span key="a" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    Unassigned
                  </span>
                ),
              ],
              [
                "Due Date",
                <span
                  key="d"
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {card.due || "—"}
                </span>,
              ],
            ].map(([label, val]) => (
              <div key={label}>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {label}
                </p>
                {val}
              </div>
            ))}
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: 14,
              marginBottom: card.claudeNotes ? 10 : 20,
              minHeight: 64,
            }}
          >
            {card.description ? (
              <SimpleMarkdown text={card.description} />
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
                No description yet.
              </p>
            )}
          </div>

          {card.claudeNotes && !card.claudeNotes.includes("⚡") && !card.claudeNotes.includes("💭") && (
            <div
              style={{
                background: "rgba(99,102,241,0.04)",
                border: "1px solid rgba(99,102,241,0.15)",
                borderRadius: 8,
                padding: 14,
                marginBottom: 20,
              }}
            >
              <p style={{
                margin: "0 0 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(129,140,248,0.6)",
              }}>
                Claude Summary
              </p>
              <SimpleMarkdown text={card.claudeNotes} />
            </div>
          )}

          {project?.claudeEnabled && (
            <ClaudePanel card={card} projectId={projectId} />
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button
              onClick={() => onDelete(projectId, card.id)}
              style={{ ...ghostBtn, color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
            >
              Delete
            </button>
            <button onClick={() => setEditing(true)} style={primaryBtn}>
              Edit
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Renders a small subset of markdown: **bold**, *italic*, `code`,
 * - bullet lists, and paragraph breaks (\n\n).
 */
function SimpleMarkdown({ text }) {
  const paragraphs = text.split(/\n{2,}/);

  return (
    <div style={{ margin: 0 }}>
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        const isList = lines.every((l) => l.trimStart().startsWith("- ") || l.trim() === "");

        if (isList) {
          return (
            <ul key={pi} style={{ margin: pi === 0 ? 0 : "8px 0 0", paddingLeft: 16 }}>
              {lines.filter((l) => l.trim()).map((line, li) => (
                <li key={li} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 2 }}>
                  <InlineMarkdown text={line.replace(/^[\s-]+/, "")} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={pi} style={{ margin: pi === 0 ? 0 : "8px 0 0", fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7 }}>
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                <InlineMarkdown text={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function InlineMarkdown({ text }) {
  // Parse **bold**, *italic*, `code` inline
  const tokens = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", content: text.slice(last, m.index) });
    if (m[0].startsWith("**"))   tokens.push({ kind: "bold",   content: m[2] });
    else if (m[0].startsWith("*")) tokens.push({ kind: "italic", content: m[3] });
    else                           tokens.push({ kind: "code",   content: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ kind: "text", content: text.slice(last) });

  return (
    <>
      {tokens.map((t, i) => {
        if (t.kind === "bold")   return <strong key={i} style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{t.content}</strong>;
        if (t.kind === "italic") return <em key={i} style={{ color: "rgba(255,255,255,0.55)" }}>{t.content}</em>;
        if (t.kind === "code")   return <code key={i} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, background: "rgba(255,255,255,0.07)", padding: "1px 5px", borderRadius: 3 }}>{t.content}</code>;
        return <span key={i}>{t.content}</span>;
      })}
    </>
  );
}

const ghostBtn = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "7px 16px",
  cursor: "pointer",
  color: "rgba(255,255,255,0.5)",
  fontSize: 12,
  fontWeight: 600,
};

const primaryBtn = {
  background: "#6366f1",
  border: "none",
  borderRadius: 8,
  padding: "7px 18px",
  cursor: "pointer",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
};
