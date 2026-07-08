import type {
  ExtractedDataset,
  ChartRecommendation,
  DatasetColumn,
} from "@/types";

/**
 * Rules-based chart recommendation engine.
 * Returns 2-4 ranked recommendations based on data shape.
 */
export function recommendCharts(
  dataset: ExtractedDataset
): ChartRecommendation[] {
  const { columns, rows } = dataset;
  if (rows.length === 0 || columns.length < 2) return [];

  const stringCols = columns.filter((c) => c.type === "string");
  const numberCols = columns.filter((c) => c.type === "number" || c.type === "currency" || c.type === "percentage");

  if (stringCols.length === 0 || numberCols.length === 0) {
    return [];
  }

  const labelCol = stringCols[0];
  const recommendations: ChartRecommendation[] = [];

  // Horizontal bar: good for ranked categories (≤12 items, 1 numeric col)
  if (rows.length <= 15 && numberCols.length >= 1) {
    const yCol = numberCols[0];
    recommendations.push({
      chartType: "horizontal_bar",
      title: `${yCol.label} by ${labelCol.label}`,
      reason: `Horizontal bar chart works well for comparing ${yCol.label} across ${rows.length} ${labelCol.label} categories. Easy to read ranked values.`,
      xKey: yCol.key,
      yKey: labelCol.key,
      confidence: 0.9,
    });
  }

  // Vertical bar: good for moderate categories
  if (rows.length >= 3 && rows.length <= 20 && numberCols.length >= 1) {
    const yCol = numberCols[0];
    recommendations.push({
      chartType: "vertical_bar",
      title: `${yCol.label} by ${labelCol.label}`,
      reason: `Vertical bar chart clearly shows ${yCol.label} differences across ${labelCol.label} groups.`,
      xKey: labelCol.key,
      yKey: yCol.key,
      confidence: 0.85,
    });
  }

  // Grouped bar: good when multiple numeric columns exist
  if (numberCols.length >= 2 && rows.length <= 12) {
    recommendations.push({
      chartType: "grouped_bar",
      title: `${numberCols.map((c) => c.label).join(" & ")} by ${labelCol.label}`,
      reason: `Grouped bar chart lets you compare ${numberCols.length} metrics side-by-side for each ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: numberCols[0].key,
      seriesKey: numberCols.length > 1 ? numberCols[1].key : undefined,
      confidence: 0.75,
    });
  }

  // Line chart: good for time-series or sequential data
  const isTimeSeries = detectTimeSeries(rows, labelCol);
  if (isTimeSeries && numberCols.length >= 1) {
    recommendations.push({
      chartType: "line",
      title: `${numberCols.map((c) => c.label).join(" & ")} over ${labelCol.label}`,
      reason: `Line chart shows trends over ${labelCol.label}, ideal for time-series data.`,
      xKey: labelCol.key,
      yKey: numberCols[0].key,
      seriesKey: numberCols.length > 1 ? numberCols[1].key : undefined,
      confidence: 0.88,
    });
  }

  // Area chart: alternative to line for cumulative view
  if (isTimeSeries && numberCols.length >= 1) {
    recommendations.push({
      chartType: "area",
      title: `${numberCols[0].label} trend by ${labelCol.label}`,
      reason: `Area chart emphasizes volume/magnitude of ${numberCols[0].label} over ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: numberCols[0].key,
      confidence: 0.7,
    });
  }

  // Donut: good for share/composition when ≤8 categories
  if (
    rows.length >= 3 &&
    rows.length <= 8 &&
    numberCols.length >= 1 &&
    (numberCols[0].type === "percentage" ||
      labelCol.label.toLowerCase().includes("category") ||
      labelCol.label.toLowerCase().includes("type"))
  ) {
    recommendations.push({
      chartType: "donut",
      title: `${numberCols[0].label} share by ${labelCol.label}`,
      reason: `Donut chart shows proportional composition of ${numberCols[0].label} across ${labelCol.label} categories.`,
      xKey: labelCol.key,
      yKey: numberCols[0].key,
      confidence: 0.72,
    });
  }

  // Scatter: good when 2+ numeric columns and enough rows
  if (numberCols.length >= 2 && rows.length >= 5) {
    recommendations.push({
      chartType: "scatter",
      title: `${numberCols[1].label} vs ${numberCols[0].label}`,
      reason: `Scatter plot reveals correlation between ${numberCols[0].label} and ${numberCols[1].label}.`,
      xKey: numberCols[0].key,
      yKey: numberCols[1].key,
      confidence: 0.65,
    });
  }

  // Sort by confidence descending, take top 4
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);
}

function detectTimeSeries(
  rows: { values: Record<string, string | number | null> }[],
  col: DatasetColumn
): boolean {
  const sample = rows.slice(0, 5).map((r) => String(r.values[col.key] ?? ""));
  // Check for Q1/Q2, YYYY-MM, YYYY, Month patterns
  return sample.some(
    (v) =>
      /^Q[1-4]\s*\d{4}/.test(v) ||
      /^\d{4}[-/]\d{2}/.test(v) ||
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(v) ||
      /^\d{4}$/.test(v)
  );
}
