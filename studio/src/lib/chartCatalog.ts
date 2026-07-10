import type { ChartType } from "@/types";

export const VALID_CHART_TYPES: ChartType[] = [
  "horizontal_bar",
  "vertical_bar",
  "grouped_bar",
  "stacked_bar",
  "line",
  "area",
  "stacked_area",
  "combo",
  "pie",
  "donut",
  "scatter",
  "bubble",
  "radar",
  "treemap",
];

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  horizontal_bar: "Horizontal Bar",
  vertical_bar: "Vertical Bar",
  grouped_bar: "Grouped Bar",
  stacked_bar: "Stacked Bar",
  line: "Line",
  area: "Area",
  stacked_area: "Stacked Area",
  combo: "Combo (Bar + Line)",
  pie: "Pie",
  donut: "Donut",
  scatter: "Scatter",
  bubble: "Bubble",
  radar: "Radar",
  treemap: "Treemap",
};

export const CHART_LLM_GUIDANCE = `
PIPELINE: profile → plan → validate → render. You are an Evident-style research chart editor (PLANNER only).
A deterministic validator will repair axes, dedupe, and score confidence — still follow the contract.

RENDERER CONTRACT (how charts are actually drawn — keys must match):
- horizontal_bar: xKey=NUMERIC metric column, yKey=STRING category column. Categories on Y-axis; bars extend right. Do NOT put category on xKey.
- vertical_bar: xKey=STRING category, yKey=NUMERIC metric
- grouped_bar: xKey=STRING category, valueKeys=[ALL comparable numeric columns to show side-by-side], yAxisLabel=shared metric name
- stacked_bar: same as grouped when showing composition across categories
- line + chartLayout=year_pivot_lines: categoryKey=entity column, valueKeys=[all year columns e.g. 2023 FTEs, 2024 FTEs], xKey may be "year"
- Wide quarterly tables (Metric + Q1/Q2/Q3/Q4): grouped_bar with xKey=Metric, valueKeys=[Q1,Q2,Q3,Q4]. NEVER set xKey to Q1 for a line.
- pie/donut: xKey=STRING category labels, yKey=NUMERIC magnitude. Prefer absolute values for slice SIZE.
- scatter: xKey and yKey = two different numeric columns
- When a table has 3+ numeric columns per row, prefer grouped_bar with valueKeys listing ALL relevant metrics.

Prefer Evident exhibit types: ranked horizontal_bar, stacked/grouped bars, donut, scatter/bubble, time-series bars/lines.
Avoid duplicate recommendations that only differ in confidence or wording.
Titles: evidence-first and specific (e.g. "2025 AI Spend by Use Case" not "Chart").
`.trim();

export const MAX_CHART_RECOMMENDATIONS = 6;
