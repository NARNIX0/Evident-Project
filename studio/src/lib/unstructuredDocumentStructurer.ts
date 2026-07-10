/**
 * Use MiniMax to turn unstructured document text into one or more reviewable tables.
 * Server-only.
 */

import type {
  ExtractedDataset,
  DatasetColumn,
  DatasetRow,
  ColumnType,
  FileExtractionResult,
  VerifiedTable,
} from "@/types";
import { callLlmJson, isLlmConfigured } from "@/lib/llmClient";
import { MAX_TABLES_PER_DOCUMENT, inferColumnType, parseNumericValue } from "@/lib/tableExtraction";
import { runAgenticTableExtraction } from "@/lib/agents/extraction/pipeline";
import { EXTRACTION_TABLE_CATEGORIES } from "@/lib/agents/extraction/categories";
import { isAgentHarnessAvailable } from "@/lib/agents/extraction/omaConfig";

const MAX_TEXT_CHARS = 14_000;

const STRUCTURE_CATEGORIES = EXTRACTION_TABLE_CATEGORIES;

interface RawStructuredRow {
  values?: Record<string, string | number | null>;
}

interface RawStructuredTable {
  name?: string;
  category?: string;
  description?: string;
  qualityScore?: number;
  issues?: string[];
  columns?: { key?: string; label?: string; type?: string }[];
  rows?: RawStructuredRow[];
}

interface RawStructuredPayload {
  documentSummary?: string;
  tables?: RawStructuredTable[];
}

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_TEXT_CHARS)}\n\n[Document truncated for processing…]`;
}

function normalizeColumnType(type: string | undefined, values: (string | number | null)[]): ColumnType {
  const allowed: ColumnType[] = [
    "string",
    "number",
    "date",
    "percentage",
    "currency",
    "unknown",
  ];
  if (type && allowed.includes(type as ColumnType)) {
    return type as ColumnType;
  }
  return inferColumnType(values.map((v) => (v == null ? null : String(v))));
}

export function rawTableToDataset(
  raw: RawStructuredTable,
  file: File,
  index: number,
  extractionMethod: string,
  documentSummary?: string
): ExtractedDataset | null {
  const columns: DatasetColumn[] = (raw.columns ?? [])
    .map((col, i) => {
      const key = col.key?.trim() || `col${i}`;
      const label = col.label?.trim() || `Column ${i + 1}`;
      const declared = normalizeColumnType(col.type, []);
      return { key, label, type: declared };
    })
    .filter((col) => col.label.length > 0);

  if (columns.length === 0 || !raw.rows?.length) {
    return null;
  }

  const rows: DatasetRow[] = raw.rows
    .map((row, rowIndex) => {
      const values: Record<string, string | number | null> = {};
      columns.forEach((col) => {
        const rawVal = row.values?.[col.key];
        if (rawVal == null || rawVal === "") {
          values[col.key] = null;
        } else if (typeof rawVal === "number") {
          values[col.key] = rawVal;
        } else {
          values[col.key] = String(rawVal);
        }
      });
      return { id: `r${rowIndex + 1}`, values };
    })
    .filter((row) =>
      Object.values(row.values).some((v) => v != null && String(v).trim() !== "")
    );

  if (rows.length === 0) {
    return null;
  }

  const typedColumns = columns.map((col, index) => {
    const declaredType = (raw.columns ?? [])[index]?.type;
    return {
      ...col,
      type: normalizeColumnType(
        declaredType ?? col.type,
        rows.map((r) => r.values[col.key] ?? null)
      ),
    };
  });

  const parsedRows = rows.map((row) => {
    const values: Record<string, string | number | null> = {};
    typedColumns.forEach((col) => {
      const rawVal = row.values[col.key];
      if (rawVal == null) {
        values[col.key] = null;
      } else if (col.type === "number" || col.type === "percentage" || col.type === "currency") {
        values[col.key] =
          typeof rawVal === "number" ? rawVal : parseNumericValue(String(rawVal));
      } else {
        values[col.key] = rawVal;
      }
    });
    return { ...row, values };
  });

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const tableName = raw.name?.trim() || `Table ${index + 1}`;
  const category = raw.category?.trim() || "Other";
  const qualityScore =
    typeof raw.qualityScore === "number"
      ? Math.min(1, Math.max(0, raw.qualityScore))
      : 0.75;

  const notes = [
    `Structured from unstructured text via ${extractionMethod}. Review and edit before charting.`,
  ];
  if (raw.description?.trim()) {
    notes.push(raw.description.trim());
  }
  if (documentSummary?.trim()) {
    notes.push(`Document summary: ${documentSummary.trim()}`);
  }
  if (raw.issues?.length) {
    notes.push(`Notes: ${raw.issues.slice(0, 2).join("; ")}`);
  }

  return {
    id: `${extractionMethod}-t${index + 1}-${Date.now()}`,
    name: `${baseName} — ${tableName}`,
    sourceType: "file",
    sourceName: file.name,
    tableIndex: index,
    extractionMethod,
    columns: typedColumns,
    rows: parsedRows,
    tableCategory: category,
    qualityScore,
    notes,
  };
}

export function normalizeStructuredPayload(
  payload: RawStructuredPayload,
  file: File,
  extractionMethod: string
): ExtractedDataset[] {
  const datasets: ExtractedDataset[] = [];

  for (const [index, raw] of (payload.tables ?? [])
    .slice(0, MAX_TABLES_PER_DOCUMENT)
    .entries()) {
    const dataset = rawTableToDataset(
      raw,
      file,
      index,
      extractionMethod,
      payload.documentSummary
    );
    if (dataset) {
      datasets.push(dataset);
    }
  }

  return datasets;
}

export function datasetsToVerifiedTables(
  datasets: ExtractedDataset[]
): VerifiedTable[] {
  return datasets.map((dataset) => ({
    tableId: dataset.id,
    category: dataset.tableCategory ?? "Other",
    qualityScore: dataset.qualityScore ?? 0.75,
    issues: [],
    cleanedDataset: dataset,
  }));
}

function buildStructurePrompt(text: string, fileName: string): string {
  return `You are a research analyst preparing structured tables from unstructured documents (meeting notes, memos, reports).

Read the document below and extract every meaningful chart-ready table the source supports (often 2–6 for meeting notes; up to ${MAX_TABLES_PER_DOCUMENT} as a hard cap).

Do NOT pad table count. Do NOT create attendee/participant/name-role rosters — those are meeting metadata, not datasets.

Good examples for meeting notes:
- Action items (owner, task, due date, status)
- Attendees / participants
- Decisions made
- Metrics or KPIs mentioned
- Timeline / milestones

Rules:
- Only create tables when there is enough content to form rows with consistent columns.
- Use clear column labels. Assign column keys col0, col1, col2, ...
- Categorise each table using one of: ${STRUCTURE_CATEGORIES.join(", ")}
- Do not invent facts not supported by the document.
- Prefer fewer high-quality tables over many sparse ones.
- Never create Attendees & Participants tables unless they include quantitative metrics.
- If the document already contains a delimited table, preserve it as one table.

Return strict JSON:
{
  "documentSummary": "one sentence",
  "tables": [
    {
      "name": "Action Items",
      "category": "Action Items",
      "description": "what this table captures",
      "qualityScore": 0.85,
      "issues": ["optional caveats"],
      "columns": [
        { "key": "col0", "label": "Owner", "type": "string" },
        { "key": "col1", "label": "Task", "type": "string" }
      ],
      "rows": [
        { "values": { "col0": "Alice", "col1": "Send follow-up email" } }
      ]
    }
  ]
}

File name: ${fileName}

Document text:
${truncateText(text)}`;
}

export async function structureUnstructuredDocument(
  text: string,
  file: File,
  extractionMethod = "unstructured-llm"
): Promise<FileExtractionResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      status: "error",
      error: "The document contains no readable text to structure.",
      source: extractionMethod,
    };
  }

  if (!isLlmConfigured()) {
    return {
      status: "error",
      error:
        "This document has unstructured text and needs MiniMax to build tables. Add LLM_API_KEY and LLM_BASE_URL to studio/.env, or paste a delimited table manually.",
      source: extractionMethod,
    };
  }

  if (isAgentHarnessAvailable()) {
    const harness = await runAgenticTableExtraction(trimmed, file);
    if (harness.ok) {
      return {
        ...harness.result,
        source: "agent-harness-oma",
      };
    }

    if (process.env.APP_ENV === "development") {
      console.warn(
        "[structureUnstructuredDocument] Agent harness failed, falling back to single-shot:",
        harness.error
      );
    }
  }

  const payload = await callLlmJson<RawStructuredPayload>(
    "You extract structured tables from unstructured documents. Return strict JSON only.",
    buildStructurePrompt(trimmed, file.name)
  );

  if (!payload?.tables?.length) {
    return {
      status: "error",
      error:
        "Could not identify structured tables in this document. Try a file with clearer lists, metrics, or action items.",
      source: extractionMethod,
    };
  }

  const datasets = normalizeStructuredPayload(payload, file, extractionMethod);
  if (datasets.length === 0) {
    return {
      status: "error",
      error:
        "MiniMax could not build usable tables from this document. Review the source text and try again.",
      source: extractionMethod,
    };
  }

  const verifiedTables = datasetsToVerifiedTables(datasets);

  return {
    status: "success",
    dataset: datasets[0],
    datasets,
    verifiedTables,
    confidence: 0.8,
    source: extractionMethod,
  };
}
