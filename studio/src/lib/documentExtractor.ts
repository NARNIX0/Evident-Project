/**
 * Document extraction service with provider fallback chain.
 *
 * Server-only — import from API routes, not client components.
 */

import type {
  FileExtractionResult,
  ExtractedDataset,
  DatasetColumn,
} from "@/types";
import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-form-recognizer";
import {
  MAX_TABLES_PER_DOCUMENT,
  parseLayoutTable,
  parseCsvLines,
  inferColumnType,
  parseNumericValue,
  type ParsedTable,
} from "@/lib/tableExtraction";
import {
  extractFromTextFile,
  extractFromDocx,
} from "@/lib/textDocumentExtractor";
import { getFileExtension, isTextUpload } from "@/lib/uploadValidation";
import { structureUnstructuredDocument } from "@/lib/unstructuredDocumentStructurer";

function env(key: string): string | undefined {
  return process.env[key];
}

export function buildDatasetFromTable(
  file: File,
  parsed: ParsedTable,
  extractionMethod: string,
  confidence: number,
  tableIndex = 0
): FileExtractionResult {
  const { headers, rowValues, sourcePage } = parsed;

  if (headers.length === 0 || rowValues.length === 0) {
    return {
      status: "error",
      error: "No structured table data could be extracted from this file.",
      source: extractionMethod,
    };
  }

  const columns: DatasetColumn[] = headers.map((label, i) => {
    const colValues = rowValues.map((row) => row[i] ?? null);
    return {
      key: `col${i}`,
      label: label || `Column ${i + 1}`,
      type: inferColumnType(colValues),
    };
  });

  const rows = rowValues.map((row, rowIndex) => {
    const values: Record<string, string | number | null> = {};
    columns.forEach((col, i) => {
      const raw = row[i] ?? null;
      values[col.key] =
        col.type === "number" || col.type === "percentage"
          ? parseNumericValue(raw)
          : raw?.trim() ?? null;
    });
    return { id: `r${rowIndex + 1}`, values };
  });

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const tableSuffix =
    tableIndex > 0 ? ` — Table ${tableIndex + 1}` : "";

  const dataset: ExtractedDataset = {
    id: `${extractionMethod}-t${tableIndex + 1}-${Date.now()}`,
    name: `${baseName}${tableSuffix}`,
    sourceType: "file",
    sourceName: file.name,
    sourcePage,
    tableIndex,
    extractionMethod,
    columns,
    rows,
    notes: [
      `Extracted via ${extractionMethod} with ${(confidence * 100).toFixed(0)}% confidence. Review values before charting.`,
    ],
  };

  return {
    status: "success",
    dataset,
    confidence,
    source: extractionMethod,
  };
}

function buildMultiTableResult(
  file: File,
  datasets: ExtractedDataset[],
  extractionMethod: string,
  confidence: number
): FileExtractionResult {
  if (datasets.length === 0) {
    return {
      status: "error",
      error: "No structured table data could be extracted from this file.",
      source: extractionMethod,
    };
  }

  return {
    status: "success",
    dataset: datasets[0],
    datasets,
    confidence,
    source: extractionMethod,
  };
}

function isAzureAvailable(): boolean {
  return Boolean(
    env("AZURE_DOCUMENT_INTELLIGENCE_KEY") &&
      env("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")
  );
}

async function extractWithAzure(file: File): Promise<FileExtractionResult> {
  const key = env("AZURE_DOCUMENT_INTELLIGENCE_KEY")!;
  const endpoint = env("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT")!;

  try {
    const client = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(key)
    );
    const buffer = Buffer.from(await file.arrayBuffer());

    const poller = await client.beginAnalyzeDocument(
      "prebuilt-layout",
      buffer
    );
    const result = await poller.pollUntilDone();

    if (!result.tables || result.tables.length === 0) {
      const paragraphText = (result.paragraphs ?? [])
        .map((p) => p.content ?? "")
        .join("\n")
        .trim();

      if (paragraphText.length > 40) {
        return structureUnstructuredDocument(
          paragraphText,
          file,
          "azure-unstructured-llm"
        );
      }

      return {
        status: "error",
        error:
          "No tables found in the document. For meeting notes or prose, ensure MiniMax is configured in studio/.env.",
        source: "azure-document-intelligence",
      };
    }

    const datasets: ExtractedDataset[] = [];

    for (const [index, table] of result.tables
      .slice(0, MAX_TABLES_PER_DOCUMENT)
      .entries()) {
      const parsed = parseLayoutTable(table);
      if (!parsed) continue;

      const built = buildDatasetFromTable(
        file,
        parsed,
        "azure-document-intelligence",
        0.9,
        index
      );
      if (built.status === "success" && built.dataset) {
        datasets.push(built.dataset);
      }
    }

    return buildMultiTableResult(
      file,
      datasets,
      "azure-document-intelligence",
      0.9
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Azure error";
    return {
      status: "error",
      error: `Azure extraction failed: ${message}`,
      source: "azure-document-intelligence",
    };
  }
}

function isMistralAvailable(): boolean {
  return Boolean(env("MISTRAL_API_KEY"));
}

async function extractWithMistral(file: File): Promise<FileExtractionResult> {
  if (file.type === "application/pdf" || getFileExtension(file.name) === ".doc") {
    return {
      status: "error",
      error:
        "Mistral OCR fallback supports images only. PDFs and Word documents require Azure Document Intelligence.",
      source: "mistral-ocr",
    };
  }

  const apiKey = env("MISTRAL_API_KEY")!;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all tables from this image. Return only CSV-style rows with a header line per table. Separate multiple tables with a blank line.",
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: "error",
        error: `Mistral API error (${response.status}): ${errorText.slice(0, 200)}`,
        source: "mistral-ocr",
      };
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content || "";
    const blocks = text
      .split(/\n\s*\n/)
      .map((block: string) =>
        block
          .split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
      )
      .filter((lines: string[]) => lines.length >= 2)
      .slice(0, MAX_TABLES_PER_DOCUMENT);

    if (blocks.length === 0) {
      const lines = text
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
      const parsed = parseCsvLines(lines);
      if (!parsed) {
        return {
          status: "error",
          error:
            "Mistral could not extract structured table data from this image.",
          source: "mistral-ocr",
        };
      }
      return buildDatasetFromTable(file, parsed, "mistral-ocr", 0.75, 0);
    }

    const datasets: ExtractedDataset[] = [];
    blocks.forEach((lines: string[], index: number) => {
      const parsed = parseCsvLines(lines);
      if (!parsed) return;
      const built = buildDatasetFromTable(
        file,
        parsed,
        "mistral-ocr",
        0.75,
        index
      );
      if (built.status === "success" && built.dataset) {
        datasets.push(built.dataset);
      }
    });

    return buildMultiTableResult(file, datasets, "mistral-ocr", 0.75);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown Mistral error";
    return {
      status: "error",
      error: `Mistral extraction failed: ${message}`,
      source: "mistral-ocr",
    };
  }
}

interface ProviderConfig {
  name: string;
  isAvailable: () => boolean;
  extract: (file: File) => Promise<FileExtractionResult>;
}

const providers: ProviderConfig[] = [
  {
    name: "azure-document-intelligence",
    isAvailable: isAzureAvailable,
    extract: extractWithAzure,
  },
  {
    name: "mistral-ocr",
    isAvailable: isMistralAvailable,
    extract: extractWithMistral,
  },
];

export function formatProviderErrors(errors: string[]): string {
  if (errors.length === 0) {
    return "Extraction failed for an unknown reason.";
  }

  const hasCredentialIssue = errors.some((error) =>
    error.includes("credentials not configured")
  );

  const guidance = hasCredentialIssue
    ? "\n\nServer OCR credentials are missing. Add AZURE_DOCUMENT_INTELLIGENCE_KEY, AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, and/or MISTRAL_API_KEY to studio/.env, then restart the app."
    : "\n\nTry a clearer file, crop to the table only, or paste the table manually.";

  return "All extraction providers failed.\n" + errors.join("\n") + guidance;
}

export async function extractDocument(file: File): Promise<FileExtractionResult> {
  if (isTextUpload(file)) {
    return extractFromTextFile(file);
  }

  if (getFileExtension(file.name) === ".docx") {
    return extractFromDocx(file);
  }

  const errors: string[] = [];

  for (const provider of providers) {
    if (!provider.isAvailable()) {
      errors.push(`${provider.name}: credentials not configured`);
      continue;
    }

    const result = await provider.extract(file);
    if (result.status === "success") {
      return result;
    }

    errors.push(`${provider.name}: ${result.error}`);
  }

  return {
    status: "error",
    error: formatProviderErrors(errors),
    source: "document-extractor",
  };
}
