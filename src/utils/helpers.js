export { PRIORITY_META, COL_ACCENTS } from "../styles/tokens";
import { TAG_COLORS } from "../styles/tokens";

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
