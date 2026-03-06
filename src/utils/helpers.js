export const PRIORITY_META = {
  high:   { label: "High",   color: "#ef4444", dot: "#ef4444" },
  medium: { label: "Medium", color: "#f59e0b", dot: "#f59e0b" },
  low:    { label: "Low",    color: "#6b7280", dot: "#6b7280" },
};

export const COL_ACCENTS = {
  todo:       "#6b7280",
  inProgress: "#6366f1",
  review:     "#f59e0b",
  done:       "#10b981",
};

const TAG_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6"];

export function tagColor(tag) {
  const hash = Math.abs(tag.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Recalculate project.tasks counts from live board data */
export function deriveTaskCounts(board) {
  const counts = { todo: 0, inProgress: 0, review: 0, done: 0 };
  for (const col of board.columns) {
    if (col.id in counts) counts[col.id] = col.cards.length;
  }
  return counts;
}

/** Recalculate progress as (done / total) * 100 */
export function deriveProgress(tasks) {
  const total = Object.values(tasks).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return Math.round((tasks.done / total) * 100);
}
