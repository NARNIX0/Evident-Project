import type { ExtractedDataset } from "@/types";

export interface SourceMetadata {
  fileName?: string;
  pageNumber?: number;
  extractionMethod: string;
  sourceType: ExtractedDataset["sourceType"];
  displayLabel: string;
}

export function buildSourceMetadata(dataset: ExtractedDataset): SourceMetadata {
  const fileName = dataset.sourceName ?? dataset.name;
  const extractionMethod = dataset.extractionMethod;

  const parts: string[] = [];
  if (fileName) {
    parts.push(fileName);
  }
  if (dataset.sourcePage != null) {
    parts.push(`page ${dataset.sourcePage}`);
  }
  if (extractionMethod) {
    parts.push(`via ${extractionMethod}`);
  }

  return {
    fileName,
    pageNumber: dataset.sourcePage,
    extractionMethod,
    sourceType: dataset.sourceType,
    displayLabel: parts.length > 0 ? parts.join(" · ") : "Unknown source",
  };
}

export function buildSourceNote(dataset: ExtractedDataset): string {
  const meta = buildSourceMetadata(dataset);
  const prefix =
    dataset.sourceType === "demo"
      ? "Demo dataset"
      : dataset.sourceType === "file"
        ? "Source file"
        : dataset.sourceType === "csv"
          ? "Source CSV"
          : "Source table";

  if (meta.pageNumber != null && meta.fileName) {
    return `${prefix}: ${meta.fileName}, page ${meta.pageNumber} (${meta.extractionMethod})`;
  }

  if (meta.fileName) {
    return `${prefix}: ${meta.fileName} (${meta.extractionMethod})`;
  }

  return `${prefix}: ${meta.extractionMethod}`;
}
