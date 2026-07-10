import type { DatasetColumn, ExtractedDataset } from "@/types";

const YEAR_IN_LABEL = /\b(19|20)\d{2}\b/;

export function extractYearFromLabel(label: string): number | null {
  const match = label.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

export function isYearMetricColumn(column: DatasetColumn): boolean {
  if (
    column.type !== "number" &&
    column.type !== "currency" &&
    column.type !== "percentage"
  ) {
    return false;
  }
  return YEAR_IN_LABEL.test(column.label);
}

export function getYearMetricColumns(columns: DatasetColumn[]): DatasetColumn[] {
  return columns
    .filter(isYearMetricColumn)
    .sort(
      (a, b) =>
        (extractYearFromLabel(a.label) ?? 0) -
        (extractYearFromLabel(b.label) ?? 0)
    );
}

export function inferSharedMetricLabel(columns: DatasetColumn[]): string {
  const labels = columns.map((col) =>
    col.label.replace(/\b(19|20)\d{2}\b/g, "").replace(/[()]/g, "").trim()
  );
  const normalized = labels.map((l) => l.toLowerCase().replace(/\s+/g, " "));
  const first = normalized[0] ?? "Value";
  if (normalized.every((l) => l === first)) {
    return labels[0] || "Value";
  }
  const common = longestCommonTokenPrefix(labels);
  return common || labels[0] || "Value";
}

function longestCommonTokenPrefix(labels: string[]): string {
  const tokenLists = labels.map((l) => l.split(/\s+/).filter(Boolean));
  const first = tokenLists[0] ?? [];
  const shared: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const token = first[i].toLowerCase();
    if (tokenLists.every((list) => list[i]?.toLowerCase() === token)) {
      shared.push(first[i]);
    } else {
      break;
    }
  }
  return shared.join(" ");
}

export function formatYearRange(columns: DatasetColumn[]): string {
  const years = columns
    .map((col) => extractYearFromLabel(col.label))
    .filter((year): year is number => year != null);
  if (years.length === 0) return "";
  const min = Math.min(...years);
  const max = Math.max(...years);
  return min === max ? String(min) : `${min}–${max}`;
}

export interface PivotedYearLineSeries {
  key: string;
  label: string;
}

export interface PivotedYearLineData {
  data: Record<string, string | number | null>[];
  series: PivotedYearLineSeries[];
  xKey: string;
  yAxisLabel: string;
}

export function pivotYearMetricsForLines(
  dataset: ExtractedDataset,
  categoryKey: string,
  yearColumnKeys: string[]
): PivotedYearLineData {
  const yearColumns = yearColumnKeys
    .map((key) => dataset.columns.find((col) => col.key === key))
    .filter((col): col is DatasetColumn => col != null)
    .sort(
      (a, b) =>
        (extractYearFromLabel(a.label) ?? 0) -
        (extractYearFromLabel(b.label) ?? 0)
    );

  const series: PivotedYearLineSeries[] = dataset.rows
    .map((row) => {
      const label = String(row.values[categoryKey] ?? "").trim();
      return { key: label, label };
    })
    .filter((s) => s.key.length > 0);

  const data = yearColumns.map((col) => {
    const year = extractYearFromLabel(col.label);
    const point: Record<string, string | number | null> = {
      year: year != null ? String(year) : col.label,
    };
    for (const row of dataset.rows) {
      const label = String(row.values[categoryKey] ?? "").trim();
      if (!label) continue;
      point[label] = row.values[col.key] ?? null;
    }
    return point;
  });

  return {
    data,
    series,
    xKey: "year",
    yAxisLabel: inferSharedMetricLabel(yearColumns),
  };
}

export function resolveYAxisLabel(
  recommendation: { yAxisLabel?: string; yKey?: string },
  columns: DatasetColumn[],
  valueKeys?: string[]
): string {
  if (recommendation.yAxisLabel?.trim()) {
    return recommendation.yAxisLabel.trim();
  }
  if (valueKeys && valueKeys.length > 1) {
    const cols = valueKeys
      .map((key) => columns.find((col) => col.key === key))
      .filter((col): col is DatasetColumn => col != null);
    if (cols.length > 1) {
      return inferSharedMetricLabel(cols);
    }
  }
  const yCol = columns.find((col) => col.key === recommendation.yKey);
  return yCol?.label ?? recommendation.yKey ?? "Value";
}
