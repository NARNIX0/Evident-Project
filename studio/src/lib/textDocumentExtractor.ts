/**
 * Extract structured tables from plain text and Word documents.
 * Server-only.
 */

import mammoth from "mammoth";
import type { FileExtractionResult, ExtractedDataset } from "@/types";
import { parseCsv, parsePastedTable } from "@/lib/parseTable";
import { getFileExtension, isTextUpload, isWordUpload } from "@/lib/uploadValidation";
import { structureUnstructuredDocument, datasetsToVerifiedTables } from "@/lib/unstructuredDocumentStructurer";
import {
  extractTablesFromDocumentText,
  hasSubstantiveMarkdownTables,
  isWeakTableDataset,
} from "@/lib/markdownDocumentParser";
import { MAX_TABLES_PER_DOCUMENT } from "@/lib/tableExtraction";

function toFileDataset(
  dataset: ExtractedDataset,
  file: File,
  extractionMethod: string
): ExtractedDataset {
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return {
    ...dataset,
    id: `${extractionMethod}-t${(dataset.tableIndex ?? 0) + 1}-${Date.now()}`,
    name: dataset.name || baseName,
    sourceType: "file",
    sourceName: file.name,
    extractionMethod,
    notes: [
      ...(dataset.notes ?? []),
      `Extracted via ${extractionMethod}. Review values before charting.`,
    ],
  };
}

function successFromDatasets(
  datasets: ExtractedDataset[],
  file: File,
  extractionMethod: string,
  confidence: number
): FileExtractionResult {
  const normalized = datasets
    .slice(0, MAX_TABLES_PER_DOCUMENT)
    .map((ds, index) =>
      toFileDataset({ ...ds, tableIndex: index }, file, extractionMethod)
    );

  return {
    status: "success",
    dataset: normalized[0],
    datasets: normalized,
    verifiedTables: datasetsToVerifiedTables(normalized),
    confidence,
    source: extractionMethod,
  };
}

export async function parseTextContentToDataset(
  text: string,
  file: File,
  extractionMethod: string
): Promise<FileExtractionResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      status: "error",
      error: "The file is empty or contains no readable text.",
      source: extractionMethod,
    };
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");

  const markdownDatasets = extractTablesFromDocumentText(trimmed, baseName);
  if (markdownDatasets.length > 0 && hasSubstantiveMarkdownTables(markdownDatasets)) {
    return successFromDatasets(markdownDatasets, file, extractionMethod, 0.92);
  }

  const parsers = [
    () => parsePastedTable(trimmed, baseName),
    () => parseCsv(trimmed, baseName),
  ];

  for (const parse of parsers) {
    try {
      const parsed = parse();
      if (isWeakTableDataset(parsed, trimmed)) {
        continue;
      }
      return successFromDatasets([parsed], file, extractionMethod, 0.95);
    } catch {
      // Try unstructured structuring next.
    }
  }

  return structureUnstructuredDocument(trimmed, file, "unstructured-llm");
}

export async function extractFromTextFile(
  file: File
): Promise<FileExtractionResult> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString("utf-8");
    return parseTextContentToDataset(text, file, "text-parser");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      status: "error",
      error: `Failed to read text file: ${message}`,
      source: "text-parser",
    };
  }
}

export async function extractFromDocx(
  file: File
): Promise<FileExtractionResult> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    if (!text) {
      return {
        status: "error",
        error:
          "No readable text found in this Word document. Try exporting as PDF or paste the table manually.",
        source: "docx-parser",
      };
    }

    return parseTextContentToDataset(text, file, "docx-parser");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      status: "error",
      error: `Failed to read Word document: ${message}`,
      source: "docx-parser",
    };
  }
}

export function isLocalTextOrDocxExtract(file: Pick<File, "name" | "type">): boolean {
  const ext = getFileExtension(file.name);
  return isTextUpload(file) || ext === ".docx";
}

export function isLegacyWordDoc(file: Pick<File, "name" | "type">): boolean {
  return getFileExtension(file.name) === ".doc";
}

export { isTextUpload, isWordUpload };
