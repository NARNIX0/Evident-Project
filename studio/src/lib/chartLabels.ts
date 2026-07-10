import { formatAxisValue } from "@/lib/chartFormatting";

export function getColumnType(
  columns: { key: string; type: string }[],
  key: string
): string | undefined {
  return columns.find((col) => col.key === key)?.type;
}

export function formatDataLabel(
  value: number,
  columnType?: string
): string {
  if (Number.isNaN(value)) return "";
  if (columnType === "percentage") {
    return `${value}%`;
  }
  return formatAxisValue(value);
}

export function formatCompositionTooltip(
  value: number,
  percent: number,
  columnType?: string,
  total?: number
): string {
  let sharePct = percent;
  if ((!sharePct || sharePct <= 0) && total && total > 0) {
    sharePct = value / total;
  }
  const share = `${(sharePct * 100).toFixed(1)}%`;
  if (columnType === "percentage") {
    return `${value}% of total (${share})`;
  }
  return `${formatAxisValue(value)} (${share})`;
}

export function formatPiePercent(percent: number): string | null {
  if (percent < 0.04) return null;
  return `${(percent * 100).toFixed(0)}%`;
}

export function sortPieData<T extends { value: number }>(data: T[]): T[] {
  return [...data].sort((a, b) => b.value - a.value);
}

export function sumPieValues(data: { value: number }[]): number {
  return data.reduce((sum, item) => sum + item.value, 0);
}
