import type {
  ExtractedDataset,
  ExtractionVerification,
  VerifiedTable,
  DatasetColumn,
  DatasetRow,
  ColumnType,
} from "@/types";
import { callLlmJson } from "@/lib/llmClient";
import { inferColumnType, parseNumericValue } from "@/lib/tableExtraction";

const MAX_ROWS_IN_PROMPT = 15;

function compactDataset(dataset: ExtractedDataset) {
  return {
    id: dataset.id,
    name: dataset.name,
    sourcePage: dataset.sourcePage,
    columns: dataset.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
    })),
    rows: dataset.rows.slice(0, MAX_ROWS_IN_PROMPT).map((r) => r.values),
  };
}

interface RawVerificationPayload {
  isValid?: boolean;
  issues?: string[];
  suggestions?: string[];
}

export function normalizeVerification(
  payload: RawVerificationPayload
): ExtractionVerification | null {
  const issues = (payload.issues ?? []).map((i) => i.trim()).filter(Boolean);
  const suggestions = (payload.suggestions ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  if (payload.isValid === undefined && issues.length === 0) {
    return null;
  }

  return {
    isValid: payload.isValid ?? issues.length === 0,
    issues,
    suggestions,
    verifiedBy: "minimax-m3",
  };
}

export function applyVerificationToDataset(
  dataset: ExtractedDataset,
  verification: ExtractionVerification
): ExtractedDataset {
  const notes = [...(dataset.notes ?? [])];
  if (verification.issues.length > 0) {
    notes.push(
      `Verification flagged ${verification.issues.length} issue(s): ${verification.issues.slice(0, 2).join("; ")}`
    );
  }

  return {
    ...dataset,
    verification,
    notes,
  };
}

export async function verifySingleTable(
  dataset: ExtractedDataset
): Promise<ExtractionVerification> {
  const payload = await callLlmJson<RawVerificationPayload>(
    "You verify extracted tables (structured markdown/CSV or OCR) for quality. Return strict JSON only.",
    `Review this extracted table for quality and completeness.

Return JSON:
{
  "isValid": boolean,
  "issues": ["problems found"],
  "suggestions": ["optional improvements"]
}

Check: sensible headers, wrong column types, missing/null-heavy metrics, merged cells, OCR/parse errors, rows that are not comparable facts.

Table:
${JSON.stringify(compactDataset(dataset), null, 2)}`
  );

  const normalized = payload ? normalizeVerification(payload) : null;
  if (normalized) {
    return normalized;
  }

  return {
    isValid: true,
    issues: [],
    suggestions: [],
    verifiedBy: "skipped",
  };
}

interface RawCleanedRow {
  values: Record<string, string | number | null>;
}

interface RawVerifiedTablePayload {
  tableId?: string;
  category?: string;
  qualityScore?: number;
  issues?: string[];
  cleanedDataset?: {
    columns?: { key: string; label: string; type?: string }[];
    rows?: RawCleanedRow[];
  };
}

interface RawMultiTablePayload {
  tables?: RawVerifiedTablePayload[];
}

function rebuildDataset(
  original: ExtractedDataset,
  cleaned: NonNullable<RawVerifiedTablePayload["cleanedDataset"]>
): ExtractedDataset | null {
  const columns: DatasetColumn[] = (cleaned.columns ?? []).map((col, i) => ({
    key: col.key || `col${i}`,
    label: col.label || `Column ${i + 1}`,
    type: (col.type as ColumnType) || "string",
  }));

  if (columns.length === 0 || !cleaned.rows?.length) {
    return null;
  }

  const rows: DatasetRow[] = cleaned.rows.map((row, rowIndex) => {
    const values: Record<string, string | number | null> = {};
    columns.forEach((col) => {
      const raw = row.values[col.key];
      if (raw == null) {
        values[col.key] = null;
      } else if (col.type === "number" || col.type === "percentage") {
        values[col.key] =
          typeof raw === "number" ? raw : parseNumericValue(String(raw));
      } else {
        values[col.key] = String(raw);
      }
    });
    return { id: `r${rowIndex + 1}`, values };
  });

  return {
    ...original,
    columns,
    rows,
  };
}

export function normalizeVerifiedTable(
  original: ExtractedDataset,
  payload: RawVerifiedTablePayload,
  index: number
): VerifiedTable {
  const rebuilt = payload.cleanedDataset
    ? rebuildDataset(original, payload.cleanedDataset)
    : null;

  const cleanedDataset = rebuilt ?? original;
  const issues = (payload.issues ?? []).map((i) => i.trim()).filter(Boolean);
  const qualityScore =
    typeof payload.qualityScore === "number"
      ? Math.min(1, Math.max(0, payload.qualityScore))
      : issues.length > 0
        ? 0.4
        : 0.75;

  return {
    tableId: payload.tableId ?? original.id,
    category: payload.category ?? "Other",
    qualityScore,
    issues,
    cleanedDataset: {
      ...cleanedDataset,
      tableCategory: payload.category ?? "Other",
      qualityScore,
      id: original.id,
      name: original.name,
    },
  };
}

export function fallbackVerifiedTables(
  datasets: ExtractedDataset[]
): VerifiedTable[] {
  return datasets.map((dataset) => ({
    tableId: dataset.id,
    category: "Other",
    qualityScore: 0.6,
    issues: [],
    cleanedDataset: {
      ...dataset,
      tableCategory: "Other",
      qualityScore: 0.6,
    },
  }));
}

export async function verifyAndCleanTables(
  datasets: ExtractedDataset[]
): Promise<VerifiedTable[]> {
  if (datasets.length === 0) return [];

  const payload = await callLlmJson<RawMultiTablePayload>(
    "You are a table verification agent. Validate structured or OCR-extracted tables, clean them, and return strict JSON only. Use only column keys from each table. Do not invent numbers.",
    `These ${datasets.length} tables were parsed from a document (markdown/CSV/structured text or OCR). Parsing succeeded — your job is VALIDATION and CLEANING, not re-extraction from scratch.

For each table:
- Verify headers make sense and column types match values (number/percentage/currency/string)
- Fix obvious parse issues (bad headers, empty rows/columns, % signs left in numeric cells as text when type is percentage)
- Keep every real data row; use null only when a cell is truly missing
- Prefer concise specific table titles already in the name; category is secondary metadata
- Categorise as one of: "Financial Metrics", "Headcount & Talent", "Investment & Budget", "Risk & Compliance", "Other"
- qualityScore 0–1; flag incomplete or low-value tables in issues
- Never invent metrics not present in the input rows

Return JSON:
{
  "tables": [
    {
      "tableId": "matching id from input",
      "category": "Financial Metrics",
      "qualityScore": 0.85,
      "issues": ["..."],
      "cleanedDataset": {
        "columns": [{"key":"col0","label":"Bank","type":"string"}],
        "rows": [{"values": {"col0": "JPM", "col1": 82}}]
      }
    }
  ]
}

Input tables:
${JSON.stringify(datasets.map(compactDataset), null, 2)}`
  );

  if (!payload?.tables?.length) {
    return fallbackVerifiedTables(datasets);
  }

  return datasets.map((dataset, index) => {
    const match =
      payload.tables!.find((t) => t.tableId === dataset.id) ??
      payload.tables![index];
    return normalizeVerifiedTable(dataset, match ?? {}, index);
  });
}
