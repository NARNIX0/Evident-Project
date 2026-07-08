import Papa from "papaparse";
import type {
  ExtractedDataset,
  DatasetColumn,
  DatasetRow,
  ColumnType,
} from "@/types";

let _nextId = 0;
function uid(): string {
  return `r${++_nextId}-${Date.now().toString(36)}`;
}

/**
 * Infer column type from raw string values (before cleanValue strips symbols).
 */
function inferColumnTypeFromRaw(rawValues: (string | undefined | null)[]): ColumnType {
  const nonNull = rawValues.filter(
    (v): v is string => v !== null && v !== undefined && v.trim() !== ""
  );
  if (nonNull.length === 0) return "unknown";

  let numCount = 0;
  let pctCount = 0;
  let curCount = 0;
  let dateCount = 0;

  for (const raw of nonNull) {
    const s = raw.trim();
    if (/^-?\d+(\.\d+)?%$/.test(s)) {
      pctCount++;
      numCount++;
    } else if (/^\$[\d,]+(\.\d+)?$/.test(s)) {
      curCount++;
      numCount++;
    } else if (/^\d{4}[-/]\d{2}([-/]\d{2})?$/.test(s)) {
      dateCount++;
    } else if (!isNaN(Number(s.replace(/,/g, ""))) && s !== "") {
      numCount++;
    }
  }

  const total = nonNull.length;
  if (pctCount / total > 0.6) return "percentage";
  if (curCount / total > 0.6) return "currency";
  if (dateCount / total > 0.6) return "date";
  if (numCount / total > 0.6) return "number";
  return "string";
}

function cleanValue(raw: string): string | number | null {
  if (raw === "" || raw === "null" || raw === "NULL" || raw === "NA" || raw === "N/A") {
    return null;
  }
  const trimmed = raw.trim();
  // percentage
  if (/^-?\d+(\.\d+)?%$/.test(trimmed)) {
    return parseFloat(trimmed.replace("%", ""));
  }
  // currency like $1,234.56
  if (/^\$[\d,]+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed.replace(/[$,]/g, ""));
  }
  // plain number with optional commas
  if (/^-?[\d,]+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed.replace(/,/g, ""));
    if (!isNaN(num)) return num;
  }
  return trimmed;
}

/**
 * Parse a CSV string into an ExtractedDataset.
 */
export function parseCsv(
  csvString: string,
  name?: string
): ExtractedDataset {
  const result = Papa.parse<string[]>(csvString, {
    skipEmptyLines: true,
  });

  const rawRows = result.data;
  if (rawRows.length < 2) {
    throw new Error(
      "CSV must have a header row and at least one data row."
    );
  }

  const headers = rawRows[0].map((h) => h.trim());
  const dataRows = rawRows.slice(1);

  // Infer column types from raw strings (before stripping %, $, etc.)
  const columns: DatasetColumn[] = headers.map((header, i) => {
    const rawColValues = dataRows.map((row) => row[i] ?? "");
    const type = inferColumnTypeFromRaw(rawColValues);
    const key = header
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    return { key, label: header, type };
  });

  const cleanedRows = dataRows.map((row) =>
    row.map((cell) => cleanValue(cell ?? ""))
  );

  const rows: DatasetRow[] = cleanedValuesToRows(cleanedRows, columns);

  return {
    id: `csv-${Date.now().toString(36)}`,
    name: name ?? "Uploaded CSV",
    sourceType: "csv",
    sourceName: name ?? "csv-upload",
    extractionMethod: "csv-parser",
    columns,
    rows,
  };
}

/**
 * Parse a pasted table (tab-separated or markdown-style).
 */
export function parsePastedTable(
  text: string,
  name?: string
): ExtractedDataset {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[|\-+\s:]+$/.test(l));

  if (lines.length < 2) {
    throw new Error(
      "Pasted table must have a header row and at least one data row."
    );
  }

  // Detect delimiter: tab, pipe, comma, or multiple spaces
  const delimiter = detectDelimiter(lines[0]);

  const parseLine = (line: string): string[] => {
    if (delimiter === "|") {
      return line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c !== "");
    }
    if (delimiter === "multi-space") {
      return line.split(/\s{2,}/).map((c) => c.trim());
    }
    return line.split(delimiter).map((c) => c.trim());
  };

  const headers = parseLine(lines[0]);
  const dataLines = lines.slice(1);

  // Infer column types from raw strings before cleaning
  const columns: DatasetColumn[] = headers.map((header, i) => {
    const rawColValues = dataLines.map((line) => {
      const cells = parseLine(line);
      return cells[i] ?? "";
    });
    const type = inferColumnTypeFromRaw(rawColValues);
    const key = header
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    return { key, label: header, type };
  });

  const cleanedRows = dataLines.map((line) =>
    parseLine(line).map((cell) => cleanValue(cell))
  );

  const rows: DatasetRow[] = cleanedValuesToRows(cleanedRows, columns);

  return {
    id: `paste-${Date.now().toString(36)}`,
    name: name ?? "Pasted Table",
    sourceType: "pasted",
    sourceName: "user-paste",
    extractionMethod: "paste-parser",
    columns,
    rows,
  };
}

function cleanedValuesToRows(
  cleaned: (string | number | null)[][],
  columns: DatasetColumn[]
): DatasetRow[] {
  return cleaned.map((cells) => {
    const values: Record<string, string | number | null> = {};
    columns.forEach((col, i) => {
      values[col.key] = cells[i] ?? null;
    });
    return { id: uid(), values };
  });
}

function detectDelimiter(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes("|")) return "|";
  if (headerLine.includes(",")) return ",";
  if (/\s{2,}/.test(headerLine)) return "multi-space";
  return ",";
}
