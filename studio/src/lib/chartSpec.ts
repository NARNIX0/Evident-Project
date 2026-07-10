import type {
  ChartRecommendation,
  ChartType,
  ExtractedDataset,
} from "@/types";
import {
  getYearMetricColumns,
  inferSharedMetricLabel,
} from "@/lib/chartDataShape";
import {
  isNumericColumn,
  isStringColumn,
  normalizeChartKeys,
  pickComparisonMetric,
} from "@/lib/chartMetricSelection";
import { profileTable, type TableProfile } from "@/lib/tableProfiler";
import { isRecommendationRenderable } from "@/lib/chartRenderGuard";
import { dedupeAndScoreRecommendations } from "@/lib/chartRecommendationQuality";

export type ChartSpecGoal =
  | "comparison"
  | "composition"
  | "trend"
  | "correlation"
  | "multi_metric";

/** Stable intermediate contract between planner and renderer. */
export interface ChartSpec {
  goal: ChartSpecGoal;
  chartType: ChartType;
  title: string;
  reason: string;
  categoryKey?: string;
  measureKey?: string;
  measureKeys?: string[];
  seriesKey?: string;
  yAxisLabel?: string;
  chartLayout?: "year_pivot_lines";
  sort?: "desc" | "asc" | "none";
  confidence: number;
}

export interface ChartValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ChartValidationResult {
  ok: boolean;
  recommendation: ChartRecommendation;
  issues: ChartValidationIssue[];
  repaired: boolean;
}

function columnMap(dataset: ExtractedDataset) {
  return new Map(dataset.columns.map((c) => [c.key, c]));
}

function goalForChartType(chartType: ChartType): ChartSpecGoal {
  switch (chartType) {
    case "pie":
    case "donut":
    case "treemap":
      return "composition";
    case "line":
    case "area":
    case "stacked_area":
    case "combo":
      return "trend";
    case "scatter":
    case "bubble":
      return "correlation";
    case "grouped_bar":
    case "stacked_bar":
    case "radar":
      return "multi_metric";
    default:
      return "comparison";
  }
}

export function recommendationToSpec(
  rec: ChartRecommendation
): ChartSpec {
  const measureKeys =
    rec.valueKeys && rec.valueKeys.length > 0
      ? rec.valueKeys
      : rec.yKey
        ? [rec.yKey]
        : undefined;

  return {
    goal: goalForChartType(rec.chartType),
    chartType: rec.chartType,
    title: rec.title,
    reason: rec.reason,
    categoryKey:
      rec.categoryKey ??
      (rec.chartType === "horizontal_bar" ? rec.yKey : rec.xKey),
    measureKey:
      rec.chartType === "horizontal_bar"
        ? rec.xKey
        : rec.chartType === "scatter" || rec.chartType === "bubble"
          ? rec.xKey
          : rec.yKey,
    measureKeys,
    seriesKey: rec.seriesKey,
    yAxisLabel: rec.yAxisLabel,
    chartLayout: rec.chartLayout,
    sort:
      rec.chartType === "horizontal_bar" ||
      rec.chartType === "pie" ||
      rec.chartType === "donut"
        ? "desc"
        : "none",
    confidence: rec.confidence,
  };
}

export function specToRecommendation(
  spec: ChartSpec,
  generationMethod?: ChartRecommendation["generationMethod"]
): ChartRecommendation {
  let xKey = spec.categoryKey;
  let yKey = spec.measureKey;

  if (spec.chartType === "horizontal_bar") {
    xKey = spec.measureKey;
    yKey = spec.categoryKey;
  } else if (spec.chartType === "scatter" || spec.chartType === "bubble") {
    xKey = spec.measureKey;
    yKey = spec.measureKeys?.[1] ?? spec.seriesKey ?? spec.measureKey;
  } else if (spec.chartLayout === "year_pivot_lines") {
    xKey = "year";
    yKey = spec.measureKeys?.[0] ?? spec.measureKey;
  }

  return {
    chartType: spec.chartType,
    title: spec.title,
    reason: spec.reason,
    xKey,
    yKey,
    seriesKey: spec.seriesKey,
    valueKeys: spec.measureKeys,
    yAxisLabel: spec.yAxisLabel,
    chartLayout: spec.chartLayout,
    categoryKey: spec.categoryKey,
    confidence: Math.min(1, Math.max(0, spec.confidence)),
    generationMethod,
  };
}

function numericKeys(dataset: ExtractedDataset): string[] {
  return dataset.columns.filter((c) => isNumericColumn(c)).map((c) => c.key);
}

function repairAxes(
  rec: ChartRecommendation,
  dataset: ExtractedDataset,
  issues: ChartValidationIssue[]
): ChartRecommendation {
  if (!rec.xKey || !rec.yKey) return rec;
  const before = { xKey: rec.xKey, yKey: rec.yKey };
  const { xKey, yKey } = normalizeChartKeys(
    rec.chartType,
    rec.xKey,
    rec.yKey,
    dataset.columns
  );
  if (xKey !== before.xKey || yKey !== before.yKey) {
    issues.push({
      code: "axes_swapped",
      message: "Swapped axes to match renderer contract.",
      severity: "info",
    });
  }
  let next: ChartRecommendation = { ...rec, xKey, yKey };

  // Mis-encoded line: numeric period on X + category on Y + multi valueKeys
  // → convert to grouped_bar (common failure on wide quarterly tables).
  if (
    (next.chartType === "line" || next.chartType === "area") &&
    next.chartLayout !== "year_pivot_lines"
  ) {
    const cols = columnMap(dataset);
    const xCol = cols.get(next.xKey!);
    const yCol = cols.get(next.yKey!);
    const valueKeys = (next.valueKeys ?? []).filter((k) => cols.has(k));
    if (
      isNumericColumn(xCol) &&
      isStringColumn(yCol) &&
      valueKeys.length >= 2
    ) {
      issues.push({
        code: "line_to_grouped_bar",
        message:
          "Converted mis-encoded line (measure on X) into grouped bars by category.",
        severity: "info",
      });
      next = {
        ...next,
        chartType: "grouped_bar",
        xKey: next.yKey,
        yKey: valueKeys[0],
        valueKeys,
        yAxisLabel:
          next.yAxisLabel ??
          inferSharedMetricLabel(
            dataset.columns.filter((c) => valueKeys.includes(c.key))
          ),
      };
    } else if (isNumericColumn(xCol) && isStringColumn(yCol)) {
      issues.push({
        code: "line_to_vertical_bar",
        message: "Converted mis-encoded line into a vertical bar chart.",
        severity: "info",
      });
      next = {
        ...next,
        chartType: "vertical_bar",
        xKey: next.yKey,
        yKey: next.xKey,
      };
    }
  }

  return next;
}

function repairCompositionMetric(
  rec: ChartRecommendation,
  dataset: ExtractedDataset,
  profile: TableProfile,
  issues: ChartValidationIssue[]
): ChartRecommendation {
  if (rec.chartType !== "pie" && rec.chartType !== "donut") return rec;
  const cols = columnMap(dataset);
  const yCol = rec.yKey ? cols.get(rec.yKey) : undefined;
  const preferred = profile.compositionMeasure;
  if (
    preferred &&
    yCol &&
    (yCol.type === "percentage" || /share|% of|of total/i.test(yCol.label)) &&
    preferred.key !== rec.yKey &&
    preferred.type !== "percentage"
  ) {
    issues.push({
      code: "composition_metric_repaired",
      message: `Using ${preferred.label} for slice size instead of share %.`,
      severity: "info",
    });
    return { ...rec, yKey: preferred.key };
  }
  return rec;
}

function repairGroupedValueKeys(
  rec: ChartRecommendation,
  dataset: ExtractedDataset,
  profile: TableProfile,
  issues: ChartValidationIssue[]
): ChartRecommendation {
  if (rec.chartType !== "grouped_bar" && rec.chartType !== "stacked_bar") {
    return rec;
  }

  const yearKeys = profile.yearMetrics.map((m) => m.key);
  if (yearKeys.length >= 2) {
    const missing = yearKeys.filter((k) => !(rec.valueKeys ?? []).includes(k));
    if (missing.length > 0 || (rec.valueKeys?.length ?? 0) < 2) {
      issues.push({
        code: "value_keys_enriched",
        message: `Included all year metrics (${yearKeys.length}).`,
        severity: "info",
      });
      return {
        ...rec,
        valueKeys: yearKeys,
        yKey: yearKeys[0],
        yAxisLabel:
          rec.yAxisLabel ??
          inferSharedMetricLabel(
            dataset.columns.filter((c) => yearKeys.includes(c.key))
          ),
      };
    }
  }

  const comparable = profile.comparableMeasures.map((m) => m.key);
  if (
    comparable.length >= 2 &&
    (!rec.valueKeys || rec.valueKeys.length < 2)
  ) {
    issues.push({
      code: "value_keys_enriched",
      message: `Included ${Math.min(comparable.length, 5)} comparable metrics.`,
      severity: "info",
    });
    const keys = comparable.slice(0, 5);
    return {
      ...rec,
      valueKeys: keys,
      yKey: keys[0],
      seriesKey: keys[1],
      yAxisLabel:
        rec.yAxisLabel ??
        inferSharedMetricLabel(
          dataset.columns.filter((c) => keys.includes(c.key)).slice(0, 2)
        ),
    };
  }

  return rec;
}

function repairYearPivot(
  rec: ChartRecommendation,
  dataset: ExtractedDataset,
  profile: TableProfile,
  issues: ChartValidationIssue[]
): ChartRecommendation {
  if (rec.chartType !== "line" || profile.yearMetrics.length < 2) return rec;
  if (rec.chartLayout === "year_pivot_lines" && rec.valueKeys?.length) {
    return rec;
  }

  const yearKeys = profile.yearMetrics.map((m) => m.key);
  const categoryKey =
    rec.categoryKey ??
    profile.primaryDimension?.key ??
    dataset.columns.find((c) => isStringColumn(c))?.key;

  if (!categoryKey) return rec;

  issues.push({
    code: "year_pivot_applied",
    message: "Applied year-column pivot for multi-year line chart.",
    severity: "info",
  });

  return {
    ...rec,
    chartLayout: "year_pivot_lines",
    categoryKey,
    valueKeys: yearKeys,
    xKey: "year",
    yKey: yearKeys[0],
    yAxisLabel:
      rec.yAxisLabel ??
      inferSharedMetricLabel(
        dataset.columns.filter((c) => yearKeys.includes(c.key))
      ),
  };
}

function hardValidate(
  rec: ChartRecommendation,
  dataset: ExtractedDataset,
  profile: TableProfile,
  issues: ChartValidationIssue[]
): boolean {
  const cols = columnMap(dataset);
  const keys = new Set(dataset.columns.map((c) => c.key));

  if (rec.chartLayout === "year_pivot_lines") {
    if (!rec.categoryKey || !keys.has(rec.categoryKey)) {
      issues.push({
        code: "missing_category",
        message: "Year-pivot line chart needs a category column.",
        severity: "error",
      });
      return false;
    }
    if (!rec.valueKeys || rec.valueKeys.length < 2) {
      issues.push({
        code: "missing_year_metrics",
        message: "Year-pivot line chart needs ≥2 year metric columns.",
        severity: "error",
      });
      return false;
    }
    return true;
  }

  if (!rec.xKey || !rec.yKey || !keys.has(rec.xKey) || !keys.has(rec.yKey)) {
    issues.push({
      code: "invalid_keys",
      message: "Chart references missing columns.",
      severity: "error",
    });
    return false;
  }

  if (rec.seriesKey && !keys.has(rec.seriesKey)) {
    issues.push({
      code: "invalid_series",
      message: "Series key does not exist.",
      severity: "error",
    });
    return false;
  }

  const xCol = cols.get(rec.xKey)!;
  const yCol = cols.get(rec.yKey)!;

  switch (rec.chartType) {
    case "horizontal_bar":
      if (!isNumericColumn(xCol) || !isStringColumn(yCol)) {
        issues.push({
          code: "bad_horizontal_bar_axes",
          message: "Horizontal bar needs numeric xKey and category yKey.",
          severity: "error",
        });
        return false;
      }
      break;
    case "vertical_bar":
    case "grouped_bar":
    case "stacked_bar":
      if (!isStringColumn(xCol) || !isNumericColumn(yCol)) {
        issues.push({
          code: "bad_bar_axes",
          message: "Bar chart needs category xKey and numeric yKey.",
          severity: "error",
        });
        return false;
      }
      if (
        (rec.chartType === "grouped_bar" || rec.chartType === "stacked_bar") &&
        (rec.valueKeys?.length ?? 0) < 2 &&
        numericKeys(dataset).length >= 2
      ) {
        issues.push({
          code: "incomplete_multi_metric",
          message: "Multi-metric chart is missing comparable valueKeys.",
          severity: "warning",
        });
      }
      break;
    case "pie":
    case "donut":
      if (!isStringColumn(xCol) || !isNumericColumn(yCol)) {
        issues.push({
          code: "bad_pie_axes",
          message: "Pie/donut needs category xKey and numeric yKey.",
          severity: "error",
        });
        return false;
      }
      if (profile.rowCount < 3 || profile.rowCount > 8) {
        issues.push({
          code: "pie_row_count",
          message: "Composition charts work best with 3–8 categories.",
          severity: "warning",
        });
      }
      if (!profile.compositionCandidate) {
        issues.push({
          code: "weak_composition",
          message: "Values may not form a clear part-to-whole.",
          severity: "warning",
        });
      }
      break;
    case "scatter":
    case "bubble":
      if (!isNumericColumn(xCol) || !isNumericColumn(yCol)) {
        issues.push({
          code: "bad_scatter_axes",
          message: "Scatter/bubble needs two numeric axes.",
          severity: "error",
        });
        return false;
      }
      break;
    case "line":
    case "area":
    case "stacked_area":
    case "combo":
      // Non-pivot lines need a category/time on X and a numeric series on Y.
      // Reject encodings like xKey=Q1 (measure) + yKey=Metric (label) that
      // produce empty/NaN plots and have crashed the chart step.
      if (!isStringColumn(xCol) || !isNumericColumn(yCol)) {
        issues.push({
          code: "bad_line_axes",
          message:
            "Line/area needs a category or time column on X and a numeric metric on Y (or year_pivot_lines).",
          severity: "error",
        });
        return false;
      }
      break;
    default:
      break;
  }

  return true;
}

function applyConfidencePenalty(
  confidence: number,
  issues: ChartValidationIssue[]
): number {
  let next = confidence;
  for (const issue of issues) {
    if (issue.severity === "warning") next -= 0.08;
    if (issue.severity === "error") next -= 0.25;
  }
  return Math.min(1, Math.max(0.15, next));
}

/**
 * Validate and repair a chart recommendation against the dataset profile.
 * Deterministic — no LLM. Safe to run on LLM and rules outputs.
 */
export function validateAndRepairRecommendation(
  dataset: ExtractedDataset,
  recommendation: ChartRecommendation,
  profile?: TableProfile
): ChartValidationResult {
  const tableProfile = profile ?? profileTable(dataset);
  const issues: ChartValidationIssue[] = [];
  let repaired = false;
  let rec = { ...recommendation };

  const before = JSON.stringify({
    xKey: rec.xKey,
    yKey: rec.yKey,
    valueKeys: rec.valueKeys,
    chartLayout: rec.chartLayout,
    categoryKey: rec.categoryKey,
  });

  rec = repairAxes(rec, dataset, issues);
  rec = repairCompositionMetric(rec, dataset, tableProfile, issues);
  rec = repairGroupedValueKeys(rec, dataset, tableProfile, issues);
  rec = repairYearPivot(rec, dataset, tableProfile, issues);

  const after = JSON.stringify({
    xKey: rec.xKey,
    yKey: rec.yKey,
    valueKeys: rec.valueKeys,
    chartLayout: rec.chartLayout,
    categoryKey: rec.categoryKey,
  });
  if (before !== after) repaired = true;

  const ok = hardValidate(rec, dataset, tableProfile, issues);
  rec.confidence = applyConfidencePenalty(rec.confidence, issues);

  if (repaired && !rec.reason.includes("Validated")) {
    const notes = issues
      .filter((i) => i.severity === "info")
      .map((i) => i.message);
    if (notes.length > 0) {
      rec.reason = `${rec.reason} (${notes[0]})`;
    }
  }

  rec.validationIssues = issues.map((i) => i.message);
  rec.repaired = repaired;

  return { ok, recommendation: rec, issues, repaired };
}

export function validateRecommendations(
  dataset: ExtractedDataset,
  recommendations: ChartRecommendation[]
): ChartRecommendation[] {
  const profile = profileTable(dataset);
  const validated = recommendations
    .map((rec) => validateAndRepairRecommendation(dataset, rec, profile))
    .filter((result) => result.ok)
    .map((result) => result.recommendation)
    .filter((rec) => isRecommendationRenderable(dataset, rec));

  // Dedupe near-identical encodings and replace LLM/default confidence
  // with a deterministic score (avoids duplicate cards at 70%/86%/95%).
  return dedupeAndScoreRecommendations(dataset, validated);
}

/** Profile-aware seed recommendations when LLM/rules need grounding. */
export function buildProfileAwareSeeds(
  dataset: ExtractedDataset,
  profile?: TableProfile
): ChartRecommendation[] {
  const p = profile ?? profileTable(dataset);
  const seeds: ChartRecommendation[] = [];
  const dim = p.primaryDimension;
  const measure = p.primaryMeasure;
  const composition = p.compositionMeasure;

  if (p.yearMetrics.length >= 2 && dim) {
    const yearKeys = p.yearMetrics.map((m) => m.key);
    const yearCols = getYearMetricColumns(dataset.columns);
    const label = inferSharedMetricLabel(yearCols);
    seeds.push({
      chartType: "line",
      title: `${label} by ${dim.label}`,
      reason: `Trend across ${yearKeys.length} year columns for each ${dim.label}.`,
      xKey: "year",
      yKey: yearKeys[0],
      valueKeys: yearKeys,
      yAxisLabel: label,
      chartLayout: "year_pivot_lines",
      categoryKey: dim.key,
      confidence: 0.93,
    });
    seeds.push({
      chartType: "grouped_bar",
      title: `${label} by ${dim.label}`,
      reason: `Side-by-side comparison of all year metrics.`,
      xKey: dim.key,
      yKey: yearKeys[0],
      valueKeys: yearKeys,
      yAxisLabel: label,
      confidence: 0.91,
    });
  }

  if (dim && measure) {
    if (p.longCategoryLabels || p.rowCount <= 12) {
      seeds.push({
        chartType: "horizontal_bar",
        title: `${measure.label} by ${dim.label}`,
        reason: `Ranked comparison of ${measure.label} across ${dim.label}.`,
        xKey: measure.key,
        yKey: dim.key,
        confidence: 0.9,
      });
    } else {
      seeds.push({
        chartType: "vertical_bar",
        title: `${measure.label} by ${dim.label}`,
        reason: `Compare ${measure.label} across ${dim.label}.`,
        xKey: dim.key,
        yKey: measure.key,
        confidence: 0.86,
      });
    }
  }

  if (
    dim &&
    p.comparableMeasures.length >= 2 &&
    p.yearMetrics.length < 2
  ) {
    const keys = p.comparableMeasures.map((m) => m.key).slice(0, 4);
    seeds.push({
      chartType: "grouped_bar",
      title: `Metrics by ${dim.label}`,
      reason: `Shows all comparable metrics side-by-side so none are hidden.`,
      xKey: dim.key,
      yKey: keys[0],
      seriesKey: keys[1],
      valueKeys: keys,
      yAxisLabel: inferSharedMetricLabel(
        dataset.columns.filter((c) => keys.includes(c.key)).slice(0, 2)
      ),
      confidence: 0.88,
    });
  }

  if (dim && composition && p.compositionCandidate) {
    seeds.push({
      chartType: "donut",
      title: `${composition.label} share by ${dim.label}`,
      reason: `Part-to-whole view using ${composition.label} magnitudes.`,
      xKey: dim.key,
      yKey: composition.key,
      confidence: 0.84,
    });
  }

  return seeds;
}

export function pickBestMeasureForGoal(
  dataset: ExtractedDataset,
  goal: ChartSpecGoal
): string | undefined {
  const profile = profileTable(dataset);
  if (goal === "composition") return profile.compositionMeasure?.key;
  if (goal === "multi_metric") return profile.comparableMeasures[0]?.key;
  const cols = dataset.columns.filter((c) => isNumericColumn(c));
  return (
    pickComparisonMetric(cols, dataset.columns.find((c) => isStringColumn(c)))
      ?.key ?? profile.primaryMeasure?.key
  );
}
