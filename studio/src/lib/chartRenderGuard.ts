import type { ChartRecommendation, ExtractedDataset } from "@/types";
import {
  getYearMetricColumns,
  pivotYearMetricsForLines,
} from "@/lib/chartDataShape";

export interface ChartSeriesRef {
  key: string;
  label: string;
}

export interface PreparedChartView {
  data: Record<string, string | number | null>[];
  xKey: string;
  yKey: string;
  yAxisLabel?: string;
  lineSeries?: ChartSeriesRef[];
  valueKeys?: string[];
  /** Chart type to actually render (may differ after empty-plot repair). */
  effectiveChartType: ChartRecommendation["chartType"];
  chartLayout?: ChartRecommendation["chartLayout"];
  /** True when we had to change layout/type to avoid an empty plot. */
  repaired: boolean;
  repairNote?: string;
  /** False when nothing drawable remains. */
  renderable: boolean;
  issues: string[];
}

function rowHasX(row: Record<string, string | number | null>, xKey: string): boolean {
  const v = row[xKey];
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function rowHasAnySeriesValue(
  row: Record<string, string | number | null>,
  seriesKeys: string[]
): boolean {
  return seriesKeys.some((key) => {
    const v = row[key];
    return v !== null && v !== undefined && !Number.isNaN(Number(v));
  });
}

/**
 * Filter plot rows without wiping year-pivot / multi-series data.
 * Bug this prevents: year-pivot points are { year, "North America", ... }
 * but yKey is still a source column like "col1" — filtering on yKey drops everything.
 */
export function filterRenderableRows(
  data: Record<string, string | number | null>[],
  options: {
    xKey: string;
    yKey: string;
    seriesKeys?: string[];
  }
): Record<string, string | number | null>[] {
  const seriesKeys =
    options.seriesKeys && options.seriesKeys.length > 0
      ? options.seriesKeys
      : [options.yKey];

  return data.filter(
    (row) => rowHasX(row, options.xKey) && rowHasAnySeriesValue(row, seriesKeys)
  );
}

export function countNumericPoints(
  data: Record<string, string | number | null>[],
  seriesKeys: string[]
): number {
  let count = 0;
  for (const row of data) {
    for (const key of seriesKeys) {
      const v = row[key];
      if (v !== null && v !== undefined && !Number.isNaN(Number(v))) {
        count += 1;
      }
    }
  }
  return count;
}

function flatRows(dataset: ExtractedDataset) {
  return dataset.rows.map((row) => {
    const point: Record<string, string | number | null> = {};
    dataset.columns.forEach((col) => {
      point[col.key] = row.values[col.key];
    });
    return point;
  });
}

function groupedBarFallback(
  dataset: ExtractedDataset,
  recommendation: ChartRecommendation
): PreparedChartView | null {
  const yearKeys =
    recommendation.valueKeys?.filter((k) =>
      dataset.columns.some((c) => c.key === k)
    ) ?? getYearMetricColumns(dataset.columns).map((c) => c.key);

  const categoryKey =
    recommendation.categoryKey ??
    dataset.columns.find((c) => c.type === "string")?.key;

  if (!categoryKey || yearKeys.length < 2) return null;

  const data = filterRenderableRows(flatRows(dataset), {
    xKey: categoryKey,
    yKey: yearKeys[0],
    seriesKeys: yearKeys,
  });

  if (data.length === 0 || countNumericPoints(data, yearKeys) === 0) {
    return null;
  }

  return {
    data,
    xKey: categoryKey,
    yKey: yearKeys[0],
    yAxisLabel: recommendation.yAxisLabel,
    valueKeys: yearKeys,
    effectiveChartType: "grouped_bar",
    chartLayout: undefined,
    repaired: true,
    repairNote:
      "Year-pivot line had no plottable points; showing grouped bars instead.",
    renderable: true,
    issues: [],
  };
}

/**
 * Build drawable chart data from a recommendation.
 * Guards against empty plots (especially year_pivot_lines).
 */
export function prepareChartView(
  dataset: ExtractedDataset,
  recommendation: ChartRecommendation
): PreparedChartView {
  const issues: string[] = [];
  const xKey =
    recommendation.xKey ?? dataset.columns[0]?.key ?? "col0";
  const yKey =
    recommendation.yKey ??
    dataset.columns[1]?.key ??
    dataset.columns[0]?.key ??
    "col0";

  if (
    recommendation.chartLayout === "year_pivot_lines" &&
    recommendation.valueKeys?.length &&
    recommendation.categoryKey
  ) {
    const pivoted = pivotYearMetricsForLines(
      dataset,
      recommendation.categoryKey,
      recommendation.valueKeys
    );
    const seriesKeys = pivoted.series
      .map((s) => s.key)
      .filter((k) => k.trim().length > 0);
    const data = filterRenderableRows(pivoted.data, {
      xKey: pivoted.xKey,
      yKey: seriesKeys[0] ?? yKey,
      seriesKeys,
    });
    const points = countNumericPoints(data, seriesKeys);

    if (data.length > 0 && points > 0 && seriesKeys.length > 0) {
      return {
        data,
        xKey: pivoted.xKey,
        yKey: seriesKeys[0],
        yAxisLabel: pivoted.yAxisLabel,
        lineSeries: pivoted.series.filter((s) => s.key.trim().length > 0),
        effectiveChartType: recommendation.chartType,
        chartLayout: "year_pivot_lines",
        repaired: false,
        renderable: true,
        issues: [],
      };
    }

    issues.push(
      "Year-pivot line produced no plottable points (series keys missing or all null)."
    );
    const fallback = groupedBarFallback(dataset, recommendation);
    if (fallback) {
      return { ...fallback, issues };
    }
  }

  const categoryKey =
    recommendation.chartType === "horizontal_bar" ? yKey : xKey;
  const metricKeys =
    recommendation.valueKeys && recommendation.valueKeys.length > 0
      ? recommendation.valueKeys
      : recommendation.chartType === "horizontal_bar"
        ? [xKey]
        : recommendation.seriesKey
          ? [yKey, recommendation.seriesKey]
          : [yKey];

  const data = filterRenderableRows(flatRows(dataset), {
    xKey: categoryKey,
    yKey: metricKeys[0] ?? yKey,
    seriesKeys: metricKeys,
  });
  const points = countNumericPoints(data, metricKeys);

  if (data.length === 0 || points === 0) {
    issues.push(
      "No rows with both a category and at least one numeric value for the selected encodings."
    );
    return {
      data: [],
      xKey,
      yKey,
      yAxisLabel: recommendation.yAxisLabel,
      effectiveChartType: recommendation.chartType,
      repaired: false,
      renderable: false,
      issues,
    };
  }

  return {
    data,
    xKey,
    yKey,
    yAxisLabel: recommendation.yAxisLabel,
    valueKeys: recommendation.valueKeys,
    effectiveChartType: recommendation.chartType,
    repaired: false,
    renderable: true,
    issues: [],
  };
}

/** Reject recommendations that cannot produce a non-empty plot. */
export function isRecommendationRenderable(
  dataset: ExtractedDataset,
  recommendation: ChartRecommendation
): boolean {
  return prepareChartView(dataset, recommendation).renderable;
}
