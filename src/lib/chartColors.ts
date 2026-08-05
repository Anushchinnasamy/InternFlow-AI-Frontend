// Chart color roles, backed by the CSS custom properties in index.css
// (dataviz skill's validated reference palette). Categorical hues are
// assigned in this fixed order — never cycled/generated — per the skill's
// non-negotiable rule.
export const CATEGORICAL_COLORS = [
  "var(--chart-1)", // blue
  "var(--chart-2)", // orange
  "var(--chart-3)", // aqua
  "var(--chart-4)", // yellow
  "var(--chart-5)", // magenta
  "var(--chart-6)", // green
  "var(--chart-7)", // violet
  "var(--chart-8)", // red
] as const;

// Series-count ladder: past 8, fold the tail into "Other" rather than
// generate a 9th hue (breaks CVD guarantees).
export const CATEGORICAL_SERIES_CAP = CATEGORICAL_COLORS.length;

export function categoricalColor(index: number): string {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}

// Single-hue sequential/ordinal ramp (blue), for trend lines and
// ordered-stage (funnel) marks. Ordinal steps stay >=2:1 contrast on both
// surfaces per the skill's palette reference.
export const SEQUENTIAL_ORDINAL_STEPS = [
  "#86b6ef", // step 250 — lightest allowed on light surface
  "#5598e7", // step 350
  "#2a78d6", // step 450
  "#1c5cab", // step 550
] as const;

export const SEQUENTIAL_LINE_COLOR = "var(--chart-1)";

// Fixed, never reused for a categorical series — always paired with an
// icon + label, never color alone.
export const STATUS_COLORS = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
} as const;

export const GRID_COLOR = "var(--border)";
export const AXIS_TEXT_COLOR = "var(--muted-foreground)";
