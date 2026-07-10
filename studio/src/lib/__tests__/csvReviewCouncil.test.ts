import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExtractedDataset } from "@/types";

vi.mock("@/lib/llmClient", () => ({
  isLlmConfigured: vi.fn(() => false),
  callLlmJson: vi.fn(),
}));

import { reviewCsvDatasets } from "../agents/csvReview/pipeline";
import { isLlmConfigured, callLlmJson } from "@/lib/llmClient";

function sampleCsv(): ExtractedDataset {
  return {
    id: "csv-1",
    name: "benchmark.csv",
    sourceType: "csv",
    extractionMethod: "csv-parser",
    columns: [
      { key: "col0", label: "Bank", type: "string" },
      { key: "col1", label: "Score", type: "number" },
    ],
    rows: [
      { id: "r1", values: { col0: "JPM", col1: 82 } },
      { id: "r2", values: { col0: "GS", col1: 78 } },
    ],
  };
}

describe("csv light review council", () => {
  beforeEach(() => {
    vi.mocked(isLlmConfigured).mockReturnValue(false);
    vi.mocked(callLlmJson).mockReset();
  });

  it("passthrough-scores when LLM is off", async () => {
    const result = await reviewCsvDatasets([sampleCsv()]);
    expect(result.method).toBe("csv-parser-only");
    expect(result.datasets).toHaveLength(1);
    expect(result.verifiedTables[0].qualityScore).toBe(0.7);
    expect(callLlmJson).not.toHaveBeenCalled();
  });

  it("runs schema steward then quality spotter when LLM is on", async () => {
    vi.mocked(isLlmConfigured).mockReturnValue(true);
    vi.mocked(callLlmJson)
      .mockResolvedValueOnce({
        tables: [
          {
            tableId: "csv-1",
            columnFixes: [{ key: "col1", label: "AI Score", type: "number" }],
          },
        ],
      })
      .mockResolvedValueOnce({
        tables: [
          {
            tableId: "csv-1",
            category: "Financial Metrics",
            qualityScore: 0.9,
            issues: [],
            cleanedDataset: {
              columns: [
                { key: "col0", label: "Bank", type: "string" },
                { key: "col1", label: "AI Score", type: "number" },
              ],
              rows: [
                { values: { col0: "JPM", col1: 82 } },
                { values: { col0: "GS", col1: 78 } },
              ],
            },
          },
        ],
      });

    const result = await reviewCsvDatasets([sampleCsv()]);
    expect(result.method).toBe("csv-light-council");
    expect(callLlmJson).toHaveBeenCalledTimes(2);
    expect(result.verifiedTables[0].category).toBe("Financial Metrics");
    expect(result.datasets[0].columns[1].label).toBe("AI Score");
  });
});
