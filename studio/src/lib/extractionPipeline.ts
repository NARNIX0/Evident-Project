import type { FileExtractionResult } from "@/types";
import { extractDocument } from "@/lib/documentExtractor";
import {
  verifyAndCleanTables,
  applyVerificationToDataset,
} from "@/lib/extractionVerificationService";
import { isLlmConfigured } from "@/lib/llmClient";

/**
 * Full extraction pipeline:
 * 1) Parse / OCR / agent extract tables
 * 2) Always run MiniMax verification + clean (including structured markdown/CSV tables)
 *
 * Parse success ≠ verified. Structured tables still need an AI validation loop.
 */
export async function extractAndVerifyDocument(
  file: File
): Promise<FileExtractionResult> {
  const raw = await extractDocument(file);
  if (raw.status === "error") {
    return raw;
  }

  const datasets =
    raw.datasets ?? (raw.dataset ? [raw.dataset] : []);

  if (datasets.length === 0) {
    return {
      status: "error",
      error: "No tables could be extracted from this document.",
      source: raw.source,
    };
  }

  const verifiedTables = await verifyAndCleanTables(datasets);
  const llmOn = isLlmConfigured();

  const cleaned = verifiedTables.map((vt) => {
    const issues = vt.issues ?? [];
    return applyVerificationToDataset(vt.cleanedDataset, {
      isValid: issues.length === 0 && (vt.qualityScore ?? 0) >= 0.5,
      issues,
      suggestions: [],
      verifiedBy: llmOn ? "minimax-m3" : "skipped",
    });
  });

  return {
    ...raw,
    dataset: cleaned[0],
    datasets: cleaned,
    verifiedTables: verifiedTables.map((vt, i) => ({
      ...vt,
      cleanedDataset: cleaned[i],
    })),
  };
}
