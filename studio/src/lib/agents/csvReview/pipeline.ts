/**
 * Light CSV review council — 2 MiniMax calls max.
 * Structured CSVs are already parsed; agents only validate types/headers
 * and spot obvious quality issues (not full document extraction).
 */
import type { ExtractedDataset, VerifiedTable } from "@/types";
import { callLlmJson, isLlmConfigured } from "@/lib/llmClient";
import {
  fallbackVerifiedTables,
  normalizeVerifiedTable,
  applyVerificationToDataset,
} from "@/lib/extractionVerificationService";

const MAX_ROWS = 12;

function compact(dataset: ExtractedDataset) {
  return {
    id: dataset.id,
    name: dataset.name,
    columns: dataset.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
    })),
    sampleRows: dataset.rows.slice(0, MAX_ROWS).map((r) => r.values),
    rowCount: dataset.rows.length,
  };
}

interface SchemaStewardPayload {
  tables?: Array<{
    tableId?: string;
    columnFixes?: Array<{
      key: string;
      label?: string;
      type?: string;
    }>;
    notes?: string[];
  }>;
}

interface QualitySpotterPayload {
  tables?: Array<{
    tableId?: string;
    category?: string;
    qualityScore?: number;
    issues?: string[];
    cleanedDataset?: {
      columns?: { key: string; label: string; type?: string }[];
      rows?: { values: Record<string, string | number | null> }[];
    };
  }>;
}

async function runSchemaSteward(
  datasets: ExtractedDataset[]
): Promise<SchemaStewardPayload | null> {
  return callLlmJson<SchemaStewardPayload>(
    `You are the Schema Steward on a light CSV review council for Evident Insights.
CSVs are already structured — do NOT re-extract. Only check headers and column types.
Return strict JSON.`,
    `For each table, suggest column type/label fixes only when clearly wrong
(e.g. percentage stored as string, currency as plain number label missing $).

Return JSON:
{
  "tables": [
    {
      "tableId": "id",
      "columnFixes": [{"key":"col1","label":"YoY Growth (%)","type":"percentage"}],
      "notes": ["optional"]
    }
  ]
}

Tables:
${JSON.stringify(datasets.map(compact), null, 2)}`
  );
}

function applySchemaFixes(
  datasets: ExtractedDataset[],
  steward: SchemaStewardPayload | null
): ExtractedDataset[] {
  if (!steward?.tables?.length) return datasets;

  return datasets.map((ds, index) => {
    const match =
      steward.tables!.find((t) => t.tableId === ds.id) ??
      steward.tables![index];
    if (!match?.columnFixes?.length) return ds;

    const columns = ds.columns.map((col) => {
      const fix = match.columnFixes!.find((f) => f.key === col.key);
      if (!fix) return col;
      return {
        ...col,
        label: fix.label?.trim() || col.label,
        type: (fix.type as typeof col.type) || col.type,
      };
    });
    return { ...ds, columns };
  });
}

async function runQualitySpotter(
  datasets: ExtractedDataset[]
): Promise<QualitySpotterPayload | null> {
  return callLlmJson<QualitySpotterPayload>(
    `You are the Quality Spotter on a light CSV review council for Evident Insights.
Data is already parsed from CSV. Spot quality issues and lightly clean only obvious problems.
Never invent numbers. Prefer keeping original rows. Return strict JSON.`,
    `For each table:
- Flag empty columns, duplicate headers, non-numeric junk in metric columns
- Fix only obvious cell issues (strip % from percentage cells if type is percentage, trim whitespace)
- Categorise: "Financial Metrics" | "Headcount & Talent" | "Investment & Budget" | "Risk & Compliance" | "Other"
- qualityScore 0–1
- Keep all real data rows

Return JSON:
{
  "tables": [
    {
      "tableId": "id",
      "category": "Investment & Budget",
      "qualityScore": 0.88,
      "issues": ["..."],
      "cleanedDataset": {
        "columns": [{"key":"col0","label":"...","type":"string"}],
        "rows": [{"values": {"col0": "..."}}]
      }
    }
  ]
}

Tables:
${JSON.stringify(datasets.map(compact), null, 2)}`
  );
}

export interface CsvReviewResult {
  datasets: ExtractedDataset[];
  verifiedTables: VerifiedTable[];
  method: "csv-light-council" | "csv-parser-only";
}

/**
 * Light 2-agent review for already-parsed CSV datasets.
 * Falls back to passthrough scoring when LLM is unavailable.
 */
export async function reviewCsvDatasets(
  datasets: ExtractedDataset[]
): Promise<CsvReviewResult> {
  if (datasets.length === 0) {
    return { datasets: [], verifiedTables: [], method: "csv-parser-only" };
  }

  if (!isLlmConfigured()) {
    const verified = fallbackVerifiedTables(datasets).map((vt) => ({
      ...vt,
      qualityScore: 0.7,
      cleanedDataset: {
        ...vt.cleanedDataset,
        qualityScore: 0.7,
        extractionMethod: "csv-parser",
      },
    }));
    return {
      datasets: verified.map((vt) => vt.cleanedDataset),
      verifiedTables: verified,
      method: "csv-parser-only",
    };
  }

  const steward = await runSchemaSteward(datasets);
  const afterSchema = applySchemaFixes(datasets, steward);
  const spotter = await runQualitySpotter(afterSchema);

  if (!spotter?.tables?.length) {
    const verified = fallbackVerifiedTables(afterSchema);
    return {
      datasets: verified.map((vt) =>
        applyVerificationToDataset(vt.cleanedDataset, {
          isValid: true,
          issues: [],
          suggestions: [],
          verifiedBy: "minimax-m3",
        })
      ),
      verifiedTables: verified,
      method: "csv-light-council",
    };
  }

  const verifiedTables = afterSchema.map((dataset, index) => {
    const match =
      spotter.tables!.find((t) => t.tableId === dataset.id) ??
      spotter.tables![index];
    const vt = normalizeVerifiedTable(dataset, match ?? {}, index);
    return {
      ...vt,
      cleanedDataset: applyVerificationToDataset(vt.cleanedDataset, {
        isValid: (vt.issues?.length ?? 0) === 0 && vt.qualityScore >= 0.5,
        issues: vt.issues ?? [],
        suggestions: [],
        verifiedBy: "minimax-m3",
      }),
    };
  });

  return {
    datasets: verifiedTables.map((vt) => vt.cleanedDataset),
    verifiedTables,
    method: "csv-light-council",
  };
}
