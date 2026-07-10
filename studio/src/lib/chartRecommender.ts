import type {
  ExtractedDataset,
  ChartRecommendation,
  DatasetColumn,
} from "@/types";
import { MAX_CHART_RECOMMENDATIONS } from "@/lib/chartCatalog";
import {
  formatYearRange,
  getYearMetricColumns,
  inferSharedMetricLabel,
} from "@/lib/chartDataShape";
import {
  pickComparisonMetric,
  pickCompositionMetric,
} from "@/lib/chartMetricSelection";

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
  const numberCols = columns.filter(
    (c) =>
      c.type === "number" ||
      c.type === "currency" ||
      c.type === "percentage"
  );

  const labelCol = pickLabelColumn(stringCols, columns, rows);
  const metricCols = pickMetricColumns(numberCols, rows);

  if (!labelCol || metricCols.length === 0) {
    return [];
  }

  const recommendations: ChartRecommendation[] = [];
  const primaryMetric =
    pickComparisonMetric(metricCols, labelCol) ?? metricCols[0];
  const compositionMetric =
    pickCompositionMetric(metricCols) ?? primaryMetric;
  const yearMetrics = getYearMetricColumns(numberCols);
  const hasYearMetricGroup = yearMetrics.length >= 2;

  if (hasYearMetricGroup && labelCol) {
    const sharedLabel = inferSharedMetricLabel(yearMetrics);
    const yearRange = formatYearRange(yearMetrics);
    const yearKeys = yearMetrics.map((col) => col.key);

    recommendations.push({
      chartType: "line",
      title: `${sharedLabel} by ${labelCol.label} (${yearRange})`,
      reason: `Line chart tracks ${sharedLabel} across ${yearMetrics.length} years for each ${labelCol.label}.`,
      xKey: "year",
      yKey: yearKeys[0],
      valueKeys: yearKeys,
      yAxisLabel: sharedLabel,
      chartLayout: "year_pivot_lines",
      categoryKey: labelCol.key,
      confidence: 0.92,
    });

    recommendations.push({
      chartType: "grouped_bar",
      title: `${sharedLabel} by ${labelCol.label} (${yearRange})`,
      reason: `Grouped bars compare all ${yearMetrics.length} years side-by-side for each ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: yearKeys[0],
      valueKeys: yearKeys,
      yAxisLabel: sharedLabel,
      confidence: 0.9,
    });
  }

  // Horizontal bar: good for ranked categories (≤15 items, 1+ metric)
  if (rows.length <= 15 && metricCols.length >= 1) {
    recommendations.push({
      chartType: "horizontal_bar",
      title: `${primaryMetric.label} by ${labelCol.label}`,
      reason: `Horizontal bar chart compares ${primaryMetric.label} across ${rows.length} ${labelCol.label} categories. City names stay readable on the axis.`,
      xKey: primaryMetric.key,
      yKey: labelCol.key,
      confidence: 0.9,
    });
  }

  // Vertical bar: good for moderate categories
  if (rows.length >= 3 && rows.length <= 20 && metricCols.length >= 1) {
    recommendations.push({
      chartType: "vertical_bar",
      title: `${primaryMetric.label} by ${labelCol.label}`,
      reason: `Vertical bar chart shows ${primaryMetric.label} differences across each ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: primaryMetric.key,
      confidence: 0.85,
    });
  }

  // Grouped bar: good when multiple numeric columns exist (non-year tables)
  if (!hasYearMetricGroup && metricCols.length >= 2 && rows.length <= 12) {
    recommendations.push({
      chartType: "grouped_bar",
      title: `${metricCols.map((c) => c.label).join(" & ")} by ${labelCol.label}`,
      reason: `Grouped bar chart compares ${metricCols.length} metrics side-by-side for each ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      seriesKey: metricCols[1].key,
      valueKeys: metricCols.slice(0, Math.min(metricCols.length, 4)).map((c) => c.key),
      yAxisLabel: inferSharedMetricLabel(metricCols.slice(0, 2)),
      confidence: 0.75,
    });
  }

  // Stacked bar: part-to-whole with multiple metrics
  if (!hasYearMetricGroup && metricCols.length >= 2 && rows.length <= 15) {
    recommendations.push({
      chartType: "stacked_bar",
      title: `${metricCols.map((c) => c.label).join(" + ")} by ${labelCol.label}`,
      reason: `Stacked bar shows how ${metricCols.length} metrics combine for each ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      seriesKey: metricCols[1].key,
      confidence: 0.73,
    });
  }

  // Line chart: good for time-series or sequential data
  const isTimeSeries = detectTimeSeries(rows, labelCol);
  if (isTimeSeries && metricCols.length >= 1) {
    recommendations.push({
      chartType: "line",
      title: `${metricCols.map((c) => c.label).join(" & ")} over ${labelCol.label}`,
      reason: `Line chart shows trends over ${labelCol.label}, ideal for time-series data.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      seriesKey: metricCols.length > 1 ? metricCols[1].key : undefined,
      confidence: 0.88,
    });
  }

  // Area chart: alternative to line for cumulative view
  if (isTimeSeries && metricCols.length >= 1) {
    recommendations.push({
      chartType: "area",
      title: `${metricCols[0].label} trend by ${labelCol.label}`,
      reason: `Area chart emphasizes volume of ${metricCols[0].label} over ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      confidence: 0.7,
    });
  }

  // Stacked area: composition over time
  if (isTimeSeries && metricCols.length >= 2) {
    recommendations.push({
      chartType: "stacked_area",
      title: `${metricCols.map((c) => c.label).join(" + ")} over ${labelCol.label}`,
      reason: `Stacked area chart shows how metrics compose over ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      seriesKey: metricCols[1].key,
      confidence: 0.76,
    });
  }

  // Combo: bar + line for volume and rate trends
  if (isTimeSeries && metricCols.length >= 2) {
    recommendations.push({
      chartType: "combo",
      title: `${metricCols[0].label} & ${metricCols[1].label} over ${labelCol.label}`,
      reason: `Combo chart pairs bars (${metricCols[0].label}) with a line (${metricCols[1].label}) to compare scale and trend.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      seriesKey: metricCols[1].key,
      confidence: 0.74,
    });
  }

  // Pie: composition / share
  if (rows.length >= 3 && rows.length <= 8 && metricCols.length >= 1) {
    recommendations.push({
      chartType: "pie",
      title: `${compositionMetric.label} share by ${labelCol.label}`,
      reason: `Pie chart shows proportional share of ${compositionMetric.label} across categories.`,
      xKey: labelCol.key,
      yKey: compositionMetric.key,
      confidence: 0.7,
    });
  }

  // Donut: good for share/composition when ≤8 categories
  if (
    rows.length >= 3 &&
    rows.length <= 8 &&
    metricCols.length >= 1
  ) {
    recommendations.push({
      chartType: "donut",
      title: `${compositionMetric.label} share by ${labelCol.label}`,
      reason: `Donut chart shows proportional composition of ${compositionMetric.label} across ${labelCol.label} categories.`,
      xKey: labelCol.key,
      yKey: compositionMetric.key,
      confidence: 0.72,
    });
  }

  // Scatter: good when 2+ metric columns and enough rows
  if (metricCols.length >= 2 && rows.length >= 5) {
    recommendations.push({
      chartType: "scatter",
      title: `${metricCols[1].label} vs ${metricCols[0].label}`,
      reason: `Scatter plot reveals correlation between ${metricCols[0].label} and ${metricCols[1].label}.`,
      xKey: metricCols[0].key,
      yKey: metricCols[1].key,
      confidence: 0.65,
    });
  }

  // Bubble: three metrics (x, y, size)
  if (metricCols.length >= 3 && rows.length >= 5) {
    recommendations.push({
      chartType: "bubble",
      title: `${metricCols[1].label} vs ${metricCols[0].label} (size: ${metricCols[2].label})`,
      reason: `Bubble chart adds a third dimension (${metricCols[2].label}) to the relationship between ${metricCols[0].label} and ${metricCols[1].label}.`,
      xKey: metricCols[0].key,
      yKey: metricCols[1].key,
      seriesKey: metricCols[2].key,
      confidence: 0.62,
    });
  }

  // Radar: multi-metric profile across few entities
  if (metricCols.length >= 3 && rows.length >= 3 && rows.length <= 8) {
    recommendations.push({
      chartType: "radar",
      title: `Multi-metric profile by ${labelCol.label}`,
      reason: `Radar chart compares ${metricCols.length} metrics across ${rows.length} ${labelCol.label} entities.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      seriesKey: metricCols[1].key,
      confidence: 0.68,
    });
  }

  // Treemap: hierarchical composition by size
  if (rows.length >= 3 && rows.length <= 12 && metricCols.length >= 1) {
    recommendations.push({
      chartType: "treemap",
      title: `${metricCols[0].label} by ${labelCol.label}`,
      reason: `Treemap uses block size to show relative ${metricCols[0].label} across ${labelCol.label}.`,
      xKey: labelCol.key,
      yKey: metricCols[0].key,
      confidence: 0.66,
    });
  }

  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_CHART_RECOMMENDATIONS);
}

export function isRankOrIndexColumn(
  col: DatasetColumn,
  rows: { values: Record<string, string | number | null> }[]
): boolean {
  const label = col.label.toLowerCase().trim();
  if (/^(rank|#|no\.?|index|row|id)$/i.test(label)) {
    return true;
  }

  const values = rows
    .map((row) => Number(row.values[col.key]))
    .filter((value) => !Number.isNaN(value));

  if (values.length !== rows.length || values.length === 0) {
    return false;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const isSequential = sorted.every((value, index) => value === index + 1);
  const max = Math.max(...values);

  return isSequential && max <= rows.length;
}

export function pickLabelColumn(
  stringCols: DatasetColumn[],
  allColumns: DatasetColumn[],
  rows: { values: Record<string, string | number | null> }[]
): DatasetColumn | undefined {
  if (stringCols.length === 0) {
    return undefined;
  }

  const preferred = stringCols.find((col) => {
    const label = col.label.toLowerCase();
    return /city|country|bank|name|category|region|company|quarter|year|month|segment|product/.test(
      label
    );
  });
  if (preferred) {
    return preferred;
  }

  const nonList = stringCols.find((col) => {
    const sample = rows
      .slice(0, 5)
      .map((row) => String(row.values[col.key] ?? ""));
    return sample.every((value) => value.length <= 40 && !value.includes(","));
  });

  return nonList ?? stringCols[0];
}

export function pickMetricColumns(
  numberCols: DatasetColumn[],
  rows: { values: Record<string, string | number | null> }[]
): DatasetColumn[] {
  const filtered = numberCols
    .filter((col) => !isRankOrIndexColumn(col, rows));

  const yearMetrics = getYearMetricColumns(filtered);
  if (yearMetrics.length >= 2) {
    const otherMetrics = filtered
      .filter((col) => !yearMetrics.some((yearCol) => yearCol.key === col.key))
      .sort(
        (a, b) => averageMagnitude(rows, b.key) - averageMagnitude(rows, a.key)
      );
    return [...yearMetrics, ...otherMetrics];
  }

  return filtered.sort(
    (a, b) => averageMagnitude(rows, b.key) - averageMagnitude(rows, a.key)
  );
}

function averageMagnitude(
  rows: { values: Record<string, string | number | null> }[],
  key: string
): number {
  const values = rows
    .map((row) => Math.abs(Number(row.values[key] ?? 0)))
    .filter((value) => !Number.isNaN(value));

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function detectTimeSeries(
  rows: { values: Record<string, string | number | null> }[],
  col: DatasetColumn
): boolean {
  const sample = rows.slice(0, 5).map((r) => String(r.values[col.key] ?? ""));
  return sample.some(
    (v) =>
      /^Q[1-4]\s*\d{4}/.test(v) ||
      /^\d{4}[-/]\d{2}/.test(v) ||
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(v) ||
      /^\d{4}$/.test(v)
  );
}
