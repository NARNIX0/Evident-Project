import type { ColumnType, DatasetColumn } from "@/types";
import type { ValidateOutput } from "./schemas";

const QUALITATIVE_IN_NUMERIC = /^(n\/a|na|steady|fast|slow|small|large|none|null|—|-)$/i;

export function countNullsInColumn(
  rows: { values: Record<string, string | number | null> }[],
  key: string
): number {
  return rows.filter((row) => {
    const v = row.values[key];
    return v == null || String(v).trim() === "";
  }).length;
}

export function isQualitativeNumericPollution(value: string | number | null): boolean {
  if (value == null) return false;
  if (typeof value === "number") return false;
  const trimmed = value.trim();
  if (QUALITATIVE_IN_NUMERIC.test(trimmed)) return true;
  if (/[a-z]/i.test(trimmed) && !/^\+?-?\d+(\.\d+)?%?$/.test(trimmed)) {
    return true;
  }
  return false;
}

export function scoreColumnTypePurity(
  column: DatasetColumn,
  rows: { values: Record<string, string | number | null> }[]
): number {
  if (column.type === "string" || column.type === "unknown") return 1;

  const nonNull = rows
    .map((r) => r.values[column.key])
    .filter((v) => v != null && String(v).trim() !== "");

  if (nonNull.length === 0) return 0;

  const polluted = nonNull.filter((v) => isQualitativeNumericPollution(v));
  return 1 - polluted.length / nonNull.length;
}

export function computeDeterministicQuality(
  table: ValidateOutput["tables"][number]
): { adjustedScore: number; extraIssues: string[] } {
  const issues: string[] = [];
  let score = table.qualityScore;

  if (table.rows.length < 2) {
    issues.push("Fewer than 2 rows — limited chart utility.");
    score -= 0.15;
  }

  const numericCols = table.columns.filter(
    (c) =>
      c.type === "number" ||
      c.type === "percentage" ||
      c.type === "currency"
  );

  for (const col of numericCols) {
    const nullRate =
      table.rows.length === 0
        ? 1
        : countNullsInColumn(table.rows, col.key) / table.rows.length;
    if (nullRate > 0.4) {
      issues.push(
        `Column "${col.label}" is more than 40% empty (${Math.round(nullRate * 100)}%).`
      );
      score -= 0.1;
    }

    const purity = scoreColumnTypePurity(
      { ...col, type: col.type as ColumnType },
      table.rows
    );
    if (purity < 0.8) {
      issues.push(
        `Column "${col.label}" mixes qualitative text with numeric data.`
      );
      score -= 0.15;
    }
  }

  const hasNumeric = numericCols.some(
    (col) => countNullsInColumn(table.rows, col.key) < table.rows.length
  );
  if (table.chartable && !hasNumeric) {
    issues.push("Marked chartable but has no usable numeric columns.");
    score -= 0.2;
  }

  return {
    adjustedScore: Math.min(1, Math.max(0, score)),
    extraIssues: issues,
  };
}

export function applyDeterministicValidation(
  output: ValidateOutput
): ValidateOutput {
  return {
    ...output,
    tables: output.tables.map((table) => {
      const { adjustedScore, extraIssues } = computeDeterministicQuality(table);
      const issues = [...new Set([...table.issues, ...extraIssues])];
      const chartable =
        table.chartable &&
        adjustedScore >= 0.55 &&
        !issues.some((i) => i.includes("mixes qualitative"));

      return {
        ...table,
        qualityScore: adjustedScore,
        chartable,
        keep: table.keep && adjustedScore >= 0.35,
        issues,
      };
    }),
  };
}
