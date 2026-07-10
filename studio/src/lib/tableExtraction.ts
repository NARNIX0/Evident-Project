import type { ColumnType } from "@/types";

export {
  MAX_LLM_CALLS_PER_EXTRACT,
  MAX_TABLES_PER_DOCUMENT,
} from "@/lib/agents/extraction/limits";

export interface ParsedTable {
  headers: string[];
  rowValues: string[][];
  sourcePage?: number;
}

/** Minimal Azure layout table shape for parsing (testable without SDK). */
export interface LayoutTableCell {
  rowIndex: number;
  columnIndex: number;
  content?: string;
}

export interface LayoutTable {
  rowCount: number;
  columnCount: number;
  cells: LayoutTableCell[];
  boundingRegions?: { pageNumber: number }[];
}

export function inferColumnType(values: (string | null)[]): ColumnType {
  const nonEmpty = values.filter((v) => v != null && String(v).trim() !== "");
  if (nonEmpty.length === 0) return "string";

  const allNumeric = nonEmpty.every(
    (v) => !isNaN(Number(String(v).replace(/[,$%]/g, "")))
  );
  if (allNumeric) return "number";

  const allPercent = nonEmpty.every((v) => String(v).trim().endsWith("%"));
  if (allPercent) return "percentage";

  return "string";
}

export function parseNumericValue(raw: string | null): string | number | null {
  if (raw == null || raw.trim() === "") return null;
  const cleaned = raw.replace(/[,$%]/g, "").trim();
  if (cleaned === "" || cleaned.toLowerCase() === "n/a") return null;
  const num = Number(cleaned);
  return isNaN(num) ? raw.trim() : num;
}

export function parseLayoutTable(table: LayoutTable): ParsedTable | null {
  if (table.columnCount === 0 || table.rowCount < 2) {
    return null;
  }

  const headers = Array.from({ length: table.columnCount }, (_, colIndex) => {
    const headerCell = table.cells.find(
      (cell) => cell.rowIndex === 0 && cell.columnIndex === colIndex
    );
    return headerCell?.content?.trim() || `Column ${colIndex + 1}`;
  });

  const rowValues: string[][] = [];
  for (let rowIndex = 1; rowIndex < table.rowCount; rowIndex++) {
    const row: string[] = [];
    for (let colIndex = 0; colIndex < table.columnCount; colIndex++) {
      const cell = table.cells.find(
        (c) => c.rowIndex === rowIndex && c.columnIndex === colIndex
      );
      row.push(cell?.content?.trim() ?? "");
    }
    if (row.some((value) => value.trim() !== "")) {
      rowValues.push(row);
    }
  }

  if (rowValues.length === 0) {
    return null;
  }

  return {
    headers,
    rowValues,
    sourcePage: table.boundingRegions?.[0]?.pageNumber,
  };
}

export function parseCsvLines(lines: string[]): ParsedTable | null {
  const trimmed = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (trimmed.length < 2) return null;

  const headers = trimmed[0].split(",").map((h) => h.trim());
  const rowValues = trimmed.slice(1).map((line) =>
    line.split(",").map((v) => v.trim())
  );

  return { headers, rowValues };
}
