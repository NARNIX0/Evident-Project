import type { ExtractedDataset, VerifiedTable } from "@/types";
import { MAX_TABLES_PER_DOCUMENT } from "@/lib/tableExtraction";
import { rawTableToDataset } from "@/lib/unstructuredDocumentStructurer";
import type { ValidateOutput } from "./schemas";

export function validatedTableToRaw(
  table: ValidateOutput["tables"][number]
): Parameters<typeof rawTableToDataset>[0] {
  return {
    name: table.name,
    category: table.category,
    description: table.description,
    qualityScore: table.qualityScore,
    issues: table.issues,
    columns: table.columns.map((col) => ({
      key: col.key,
      label: col.label,
      type: col.type,
    })),
    rows: table.rows.map((row) => ({
      values: row.values,
    })),
  };
}

export function convertValidatedToDatasets(
  validated: ValidateOutput,
  file: File,
  documentSummary: string,
  extractionMethod = "agent-harness-oma"
): ExtractedDataset[] {
  const datasets: ExtractedDataset[] = [];

  for (const [index, table] of validated.tables
    .filter((t) => t.keep)
    .slice(0, MAX_TABLES_PER_DOCUMENT)
    .entries()) {
    const dataset = rawTableToDataset(
      validatedTableToRaw(table),
      file,
      index,
      extractionMethod,
      validated.documentSummary ?? documentSummary
    );

    if (!dataset) continue;

    const citationNotes: string[] = [];
    for (const row of table.rows) {
      if (row.citations && Object.keys(row.citations).length > 0) {
        const cite = Object.values(row.citations)[0];
        if (cite) citationNotes.push(cite);
      }
    }

    datasets.push({
      ...dataset,
      tableCategory: table.category,
      qualityScore: table.qualityScore,
      notes: [
        ...(dataset.notes ?? []),
        table.chartable
          ? "Chart-ready after agent validation."
          : "Review recommended — limited chart utility.",
        ...table.issues.slice(0, 3).map((issue) => `Validator: ${issue}`),
      ],
    });
  }

  return datasets;
}

export function datasetsToHarnessVerifiedTables(
  datasets: ExtractedDataset[],
  validated: ValidateOutput
): VerifiedTable[] {
  const issueByName = new Map(
    validated.tables.map((t) => [t.name, t.issues] as const)
  );

  return datasets.map((dataset) => {
    const tableName = dataset.name.split(" — ").pop() ?? dataset.name;
    const issues = issueByName.get(tableName) ?? [];

    return {
      tableId: dataset.id,
      category: dataset.tableCategory ?? "Other",
      qualityScore: dataset.qualityScore ?? 0.7,
      issues,
      cleanedDataset: dataset,
    };
  });
}
