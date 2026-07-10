/**
 * Read a CSV/TSV File and parse it into an ExtractedDataset (browser-only).
 */
import { parseCsv } from "@/lib/parseTable";
import type { ExtractedDataset } from "@/types";

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

export async function parseCsvFile(file: File): Promise<ExtractedDataset> {
  const text = await readFileAsText(file);
  return parseCsv(text, file.name);
}
