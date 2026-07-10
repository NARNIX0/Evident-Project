import type { DatasetColumn, ExtractedDataset } from "@/types";
import {
  getYearMetricColumns,
  inferSharedMetricLabel,
} from "@/lib/chartDataShape";
import {
  isNumericColumn,
  isStringColumn,
  pickComparisonMetric,
  pickCompositionMetric,
} from "@/lib/chartMetricSelection";

function isRankOrIndexColumn(
  col: DatasetColumn,
  rows: ExtractedDataset["rows"]
): boolean {
  const label = col.label.toLowerCase().trim();
  if (/^(rank|#|no\.?|index|row|id)$/i.test(label)) return true;
  const values = rows
    .map((row) => Number(row.values[col.key]))
    .filter((value) => !Number.isNaN(value));
  if (values.length !== rows.length || values.length === 0) return false;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted.every((value, index) => value === index + 1) &&
    Math.max(...values) <= rows.length
  );
}

export type ChartGoal =
  | "comparison"
  | "composition"
  | "trend"
  | "correlation"
  | "multi_metric";

export interface ColumnProfile {
  key: string;
  label: string;
  type: DatasetColumn["type"];
  role: "dimension" | "measure" | "rank" | "unused";
  nullRate: number;
  cardinality: number;
  avgMagnitude: number;
  positiveRate: number;
  isYearMetric: boolean;
  isShareLike: boolean;
}

export interface TableProfile {
  rowCount: number;
  dimensions: ColumnProfile[];
  measures: ColumnProfile[];
  yearMetrics: ColumnProfile[];
  primaryDimension?: ColumnProfile;
  primaryMeasure?: ColumnProfile;
  compositionMeasure?: ColumnProfile;
  comparableMeasures: ColumnProfile[];
  suggestedGoals: ChartGoal[];
  compositionCandidate: boolean;
  longCategoryLabels: boolean;
  summaryForPrompt: string;
}

function numericValues(
  rows: ExtractedDataset["rows"],
  key: string
): number[] {
  return rows
    .map((row) => Number(row.values[key]))
    .filter((value) => !Number.isNaN(value));
}

function profileColumn(
  col: DatasetColumn,
  rows: ExtractedDataset["rows"],
  yearKeys: Set<string>
): ColumnProfile {
  const values = rows.map((row) => row.values[col.key]);
  const nullCount = values.filter((v) => v == null || v === "").length;
  const distinct = new Set(
    values.filter((v) => v != null && v !== "").map((v) => String(v))
  );
  const nums = numericValues(rows, col.key);
  const avgMagnitude =
    nums.length === 0
      ? 0
      : nums.reduce((sum, n) => sum + Math.abs(n), 0) / nums.length;
  const positiveRate =
    nums.length === 0 ? 0 : nums.filter((n) => n > 0).length / nums.length;

  const isRank = isRankOrIndexColumn(col, rows);
  const isShareLike =
    /share|% of|percent of total|of total/i.test(col.label) ||
    (col.type === "percentage" && /share|total/i.test(col.label));

  let role: ColumnProfile["role"] = "unused";
  if (isRank) {
    role = "rank";
  } else if (isNumericColumn(col)) {
    role = "measure";
  } else if (isStringColumn(col)) {
    role = "dimension";
  }

  return {
    key: col.key,
    label: col.label,
    type: col.type,
    role,
    nullRate: rows.length === 0 ? 1 : nullCount / rows.length,
    cardinality: distinct.size,
    avgMagnitude,
    positiveRate,
    isYearMetric: yearKeys.has(col.key),
    isShareLike,
  };
}

function detectTimeLike(dim: ColumnProfile, rows: ExtractedDataset["rows"]): boolean {
  const sample = rows
    .slice(0, 6)
    .map((r) => String(r.values[dim.key] ?? ""));
  return sample.some(
    (v) =>
      /^Q[1-4]\s*\d{4}/.test(v) ||
      /^\d{4}[-/]\d{2}/.test(v) ||
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(v) ||
      /^\d{4}$/.test(v)
  );
}

function partsSumNearWhole(
  rows: ExtractedDataset["rows"],
  measureKey: string,
  measureType: DatasetColumn["type"]
): boolean {
  const nums = numericValues(rows, measureKey);
  if (nums.length < 3 || nums.some((n) => n < 0)) return false;
  const sum = nums.reduce((a, b) => a + b, 0);
  if (measureType === "percentage") {
    return sum >= 85 && sum <= 115;
  }
  return sum > 0;
}

export function profileTable(dataset: ExtractedDataset): TableProfile {
  const { columns, rows } = dataset;
  const yearCols = getYearMetricColumns(columns);
  const yearKeys = new Set(yearCols.map((c) => c.key));

  const profiles = columns.map((col) => profileColumn(col, rows, yearKeys));
  const dimensions = profiles
    .filter((p) => p.role === "dimension" && p.nullRate < 0.5)
    .sort((a, b) => a.cardinality - b.cardinality);
  const measures = profiles
    .filter((p) => p.role === "measure" && p.nullRate < 0.6)
    .sort((a, b) => b.avgMagnitude - a.avgMagnitude);

  const yearMetrics = profiles.filter((p) => p.isYearMetric);
  const measureCols = measures
    .map((m) => columns.find((c) => c.key === m.key)!)
    .filter(Boolean);
  const dimCol = dimensions[0]
    ? columns.find((c) => c.key === dimensions[0].key)
    : undefined;

  const primaryMeasureCol =
    pickComparisonMetric(measureCols, dimCol) ?? measureCols[0];
  const compositionMeasureCol =
    pickCompositionMetric(measureCols) ?? primaryMeasureCol;

  const primaryDimension = dimensions[0];
  const primaryMeasure = primaryMeasureCol
    ? measures.find((m) => m.key === primaryMeasureCol.key)
    : undefined;
  const compositionMeasure = compositionMeasureCol
    ? measures.find((m) => m.key === compositionMeasureCol.key)
    : undefined;

  const comparableMeasures =
    yearMetrics.length >= 2
      ? yearMetrics
      : measures.filter((m) => !m.isShareLike).slice(0, 5);

  const compositionCandidate =
    rows.length >= 3 &&
    rows.length <= 8 &&
    !!compositionMeasure &&
    compositionMeasure.positiveRate >= 0.8 &&
    partsSumNearWhole(rows, compositionMeasure.key, compositionMeasure.type);

  const longCategoryLabels =
    !!primaryDimension &&
    rows.some(
      (r) => String(r.values[primaryDimension.key] ?? "").length >= 14
    );

  const suggestedGoals: ChartGoal[] = [];
  if (yearMetrics.length >= 2 && primaryDimension) {
    suggestedGoals.push("trend", "multi_metric");
  }
  if (primaryDimension && primaryMeasure) {
    suggestedGoals.push("comparison");
  }
  if (compositionCandidate) {
    suggestedGoals.push("composition");
  }
  if (comparableMeasures.length >= 2 && primaryDimension) {
    if (!suggestedGoals.includes("multi_metric")) {
      suggestedGoals.push("multi_metric");
    }
  }
  if (
    measures.length >= 2 &&
    rows.length >= 5 &&
    !yearMetrics.length
  ) {
    suggestedGoals.push("correlation");
  }
  if (
    primaryDimension &&
    detectTimeLike(primaryDimension, rows) &&
    primaryMeasure
  ) {
    if (!suggestedGoals.includes("trend")) suggestedGoals.push("trend");
  }

  const uniqueGoals = [...new Set(suggestedGoals)];

  const summaryForPrompt = [
    `rows=${rows.length}`,
    `dimensions=${dimensions.map((d) => `${d.key}(${d.label}, card=${d.cardinality})`).join(" | ") || "none"}`,
    `measures=${measures
      .map(
        (m) =>
          `${m.key}(${m.label}, type=${m.type}, null=${Math.round(m.nullRate * 100)}%${m.isShareLike ? ", share-like" : ""}${m.isYearMetric ? ", year" : ""})`
      )
      .join(" | ") || "none"}`,
    `primaryDimension=${primaryDimension?.key ?? "none"}`,
    `primaryMeasure=${primaryMeasure?.key ?? "none"}`,
    `compositionMeasure=${compositionMeasure?.key ?? "none"}`,
    `comparableMeasures=${comparableMeasures.map((m) => m.key).join(",") || "none"}`,
    `suggestedGoals=${uniqueGoals.join(",") || "none"}`,
    `compositionCandidate=${compositionCandidate}`,
    `longCategoryLabels=${longCategoryLabels}`,
    yearMetrics.length >= 2
      ? `yearMetricGroup=${inferSharedMetricLabel(yearCols)} [${yearMetrics.map((m) => m.key).join(",")}]`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    rowCount: rows.length,
    dimensions,
    measures,
    yearMetrics,
    primaryDimension,
    primaryMeasure,
    compositionMeasure,
    comparableMeasures,
    suggestedGoals: uniqueGoals,
    compositionCandidate,
    longCategoryLabels,
    summaryForPrompt,
  };
}
