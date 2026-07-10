import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ExtractedDataset, FileExtractionResult } from "@/types";

vi.mock("@/lib/documentExtractor", () => ({
  extractDocument: vi.fn(),
}));

vi.mock("@/lib/extractionVerificationService", async () => {
  const actual = await vi.importActual<
    typeof import("../extractionVerificationService")
  >("../extractionVerificationService");
  return {
    ...actual,
    verifyAndCleanTables: vi.fn(),
  };
});

import { extractAndVerifyDocument } from "../extractionPipeline";
import { extractDocument } from "@/lib/documentExtractor";
import { verifyAndCleanTables } from "@/lib/extractionVerificationService";

const sampleDataset: ExtractedDataset = {
  id: "ds-1",
  name: "notes — AI Investment by Use Case",
  sourceType: "file",
  extractionMethod: "text-parser",
  columns: [
    { key: "col0", label: "Use Case", type: "string" },
    { key: "col1", label: "Spend ($M)", type: "currency" },
  ],
  rows: [
    { id: "r1", values: { col0: "Fraud", col1: 18 } },
    { id: "r2", values: { col0: "Credit", col1: 16 } },
  ],
};

describe("extractAndVerifyDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs AI verification even when structured parser already returned verifiedTables", async () => {
    const raw: FileExtractionResult = {
      status: "success",
      dataset: sampleDataset,
      datasets: [sampleDataset],
      verifiedTables: [
        {
          tableId: "ds-1",
          category: "Other",
          qualityScore: 0.92,
          issues: [],
          cleanedDataset: sampleDataset,
        },
      ],
      confidence: 0.92,
      source: "text-parser",
    };

    vi.mocked(extractDocument).mockResolvedValue(raw);
    vi.mocked(verifyAndCleanTables).mockResolvedValue([
      {
        tableId: "ds-1",
        category: "Investment & Budget",
        qualityScore: 0.9,
        issues: [],
        cleanedDataset: {
          ...sampleDataset,
          tableCategory: "Investment & Budget",
          qualityScore: 0.9,
        },
      },
    ]);

    const file = new File(["| a | b |\n|---|---|\n| x | 1 |"], "tables.md", {
      type: "text/markdown",
    });

    const result = await extractAndVerifyDocument(file);

    expect(verifyAndCleanTables).toHaveBeenCalledTimes(1);
    expect(verifyAndCleanTables).toHaveBeenCalledWith([sampleDataset]);
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.verifiedTables?.[0].category).toBe("Investment & Budget");
      expect(result.datasets?.[0].verification).toBeDefined();
    }
  });

  it("still verifies agent-harness outputs (final validation gate)", async () => {
    const raw: FileExtractionResult = {
      status: "success",
      dataset: sampleDataset,
      datasets: [sampleDataset, { ...sampleDataset, id: "ds-2" }],
      verifiedTables: [
        {
          tableId: "ds-1",
          category: "Investment & Budget",
          qualityScore: 0.8,
          issues: [],
          cleanedDataset: sampleDataset,
        },
      ],
      confidence: 0.85,
      source: "agent-harness-oma",
    };

    vi.mocked(extractDocument).mockResolvedValue(raw);
    vi.mocked(verifyAndCleanTables).mockResolvedValue([
      {
        tableId: "ds-1",
        category: "Investment & Budget",
        qualityScore: 0.88,
        issues: ["Minor null in optional column"],
        cleanedDataset: sampleDataset,
      },
      {
        tableId: "ds-2",
        category: "Other",
        qualityScore: 0.7,
        issues: [],
        cleanedDataset: { ...sampleDataset, id: "ds-2" },
      },
    ]);

    const file = new File(["notes"], "notes.txt", { type: "text/plain" });
    await extractAndVerifyDocument(file);

    expect(verifyAndCleanTables).toHaveBeenCalledTimes(1);
  });
});
