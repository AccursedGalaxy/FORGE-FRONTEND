// ── Design Tokens ──────────────────────────────────────────────────────────────
// Single source of truth for all visual constants.
// Import from here in components; change here to affect the whole UI.

export const COLORS = {
  bg:           "#080910",
  surface:      "rgba(255,255,255,0.03)",
  surfaceHover: "rgba(255,255,255,0.06)",
  border:       "rgba(255,255,255,0.07)",
  borderHover:  "rgba(255,255,255,0.14)",
  brand:        "#6366f1",
  brandMuted:   "rgba(99,102,241,0.2)",
  brandFocus:   "rgba(99,102,241,0.4)",
  brandText:    "#a5b4fc",

  textPrimary:   "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.5)",
  textMuted:     "rgba(255,255,255,0.35)",
  textFaint:     "rgba(255,255,255,0.2)",
  textDisabled:  "rgba(255,255,255,0.15)",

  success: "#10b981",
  warning: "#f59e0b",
  danger:  "#ef4444",
  info:    "#06b6d4",
  purple:  "#8b5cf6",
  pink:    "#ec4899",
  gray:    "#6b7280",

  navBg:     "rgba(8,9,16,0.95)",
  navBorder: "rgba(255,255,255,0.07)",
};

export const FONTS = {
  sans: "'DM Sans', sans-serif",
  syne: "'Syne', sans-serif",
  mono: "'DM Mono', monospace",
};

export const FONT_SIZE = {
  xs:   9,
  sm:   10,
  base: 11,
  md:   12,
  lg:   13,
  xl:   14,
  "2xl": 15,
  "3xl": 22,
  "4xl": 30,
};

export const SPACE = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
};

export const RADIUS = {
  sm:   6,
  md:   8,
  lg:   10,
  xl:   12,
  "2xl": 14,
  full: 9999,
};

// ── Board / column sizing ──────────────────────────────────────────────────────
export const COLUMN = {
  minWidth: 240,
  maxWidth: 420,
};

// ── Priority colors (was in helpers.js) ───────────────────────────────────────
export const PRIORITY_META = {
  high:   { label: "High",   color: COLORS.danger,  dot: COLORS.danger  },
  medium: { label: "Medium", color: COLORS.warning, dot: COLORS.warning },
  low:    { label: "Low",    color: COLORS.gray,    dot: COLORS.gray    },
};

// ── Column accent colors (was in helpers.js) ──────────────────────────────────
export const COL_ACCENTS = {
  todo:       COLORS.gray,
  inProgress: COLORS.brand,
  review:     COLORS.warning,
  done:       COLORS.success,
};

// ── Tag palette (was in helpers.js) ───────────────────────────────────────────
export const TAG_COLORS = [
  COLORS.brand,
  COLORS.success,
  COLORS.warning,
  COLORS.pink,
  COLORS.info,
  COLORS.purple,
];
