import Papa from "papaparse";
import type { ExtractedDataset } from "@/types";

/**
 * Export an ExtractedDataset as a CSV file and trigger browser download.
 */
export function exportDatasetAsCsv(dataset: ExtractedDataset): void {
  const headers = dataset.columns.map((c) => c.label);
  const data = dataset.rows.map((row) =>
    dataset.columns.map((col) => {
      const v = row.values[col.key];
      return v === null || v === undefined ? "" : String(v);
    })
  );

  const csv = Papa.unparse({ fields: headers, data });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${dataset.name.replace(/[^a-z0-9]+/gi, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Return CSV content as a string (for preview/copy).
 */
export function datasetToCsvString(dataset: ExtractedDataset): string {
  const headers = dataset.columns.map((c) => c.label);
  const data = dataset.rows.map((row) =>
    dataset.columns.map((col) => {
      const v = row.values[col.key];
      return v === null || v === undefined ? "" : String(v);
    })
  );
  return Papa.unparse({ fields: headers, data });
}
