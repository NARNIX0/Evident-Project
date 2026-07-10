import type { DatasetColumn } from "@/types";

const NUMERIC_TYPES = new Set(["number", "currency", "percentage"]);

export function isNumericColumn(col?: DatasetColumn): boolean {
  return col != null && NUMERIC_TYPES.has(col.type);
}

export function isStringColumn(col?: DatasetColumn): boolean {
  return col?.type === "string" || col?.type === "date";
}

/** Prefer absolute amounts/counts for pie/donut slice size (not share %). */
export function pickCompositionMetric(
  metrics: DatasetColumn[]
): DatasetColumn | undefined {
  if (metrics.length === 0) return undefined;

  const absolute = metrics.filter((c) => c.type !== "percentage");
  const preferred = absolute.find((c) =>
    /investment|spend|budget|revenue|count|fte|volume|amount|\(\$|usd/i.test(
      c.label
    )
  );
  if (preferred) return preferred;

  const nonShare = absolute.find(
    (c) => !/share|percent|% of/i.test(c.label)
  );
  return nonShare ?? absolute[0] ?? metrics[0];
}

/** Primary metric for ranked bar charts — prefer core KPI over secondary fields. */
export function pickComparisonMetric(
  metrics: DatasetColumn[],
  labelCol?: DatasetColumn
): DatasetColumn | undefined {
  if (metrics.length === 0) return undefined;

  const adoption = metrics.find((c) =>
    /adoption|usage|penetration|core process/i.test(c.label)
  );
  if (adoption) return adoption;

  const labelHint = labelCol?.label.toLowerCase() ?? "";
  const preferred = metrics.find((c) => {
    const label = c.label.toLowerCase();
    if (/investment|spend|budget/i.test(labelHint)) {
      return /investment|spend|budget|\$|usd/i.test(label);
    }
    if (/headcount|talent|fte/i.test(labelHint)) {
      return /fte|headcount|employee/i.test(label);
    }
    return false;
  });
  if (preferred) return preferred;

  const nonShare = metrics.find(
    (c) => c.type !== "percentage" || !/share|of total/i.test(c.label)
  );
  return nonShare ?? metrics[0];
}

/** Swap axes when horizontal_bar has category on X and metric on Y. */
export function normalizeHorizontalBarKeys(
  xKey: string,
  yKey: string,
  columns: DatasetColumn[]
): { xKey: string; yKey: string } {
  const xCol = columns.find((c) => c.key === xKey);
  const yCol = columns.find((c) => c.key === yKey);
  if (isStringColumn(xCol) && isNumericColumn(yCol)) {
    return { xKey: yKey, yKey: xKey };
  }
  return { xKey, yKey };
}

/** Swap when vertical_bar has metric on X and category on Y. */
export function normalizeVerticalBarKeys(
  xKey: string,
  yKey: string,
  columns: DatasetColumn[]
): { xKey: string; yKey: string } {
  const xCol = columns.find((c) => c.key === xKey);
  const yCol = columns.find((c) => c.key === yKey);
  if (isNumericColumn(xCol) && isStringColumn(yCol)) {
    return { xKey: yKey, yKey: xKey };
  }
  return { xKey, yKey };
}

export function normalizeChartKeys(
  chartType: string,
  xKey: string,
  yKey: string,
  columns: DatasetColumn[]
): { xKey: string; yKey: string } {
  if (chartType === "horizontal_bar") {
    return normalizeHorizontalBarKeys(xKey, yKey, columns);
  }
  if (chartType === "vertical_bar") {
    return normalizeVerticalBarKeys(xKey, yKey, columns);
  }
  return { xKey, yKey };
}
