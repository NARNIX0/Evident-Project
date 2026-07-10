import { describe, it, expect } from "vitest";
import {
  normalizeVerification,
  applyVerificationToDataset,
  normalizeVerifiedTable,
  fallbackVerifiedTables,
} from "../extractionVerificationService";
import { normalizeLlmRecommendations } from "../llmChartRecommender";
import type { ExtractedDataset } from "@/types";

const sampleDataset: ExtractedDataset = {
  id: "ds-1",
  name: "Test",
  sourceType: "file",
  extractionMethod: "azure",
  columns: [
    { key: "col0", label: "Bank", type: "string" },
    { key: "col1", label: "Score", type: "number" },
  ],
  rows: [
    { id: "r1", values: { col0: "JPM", col1: 82 } },
    { id: "r2", values: { col0: "GS", col1: 78 } },
  ],
};

describe("extractionVerificationService", () => {
  it("normalizes verification payload", () => {
    const v = normalizeVerification({
      isValid: false,
      issues: ["Header row looks merged"],
      suggestions: ["Split combined column"],
    });
    expect(v?.isValid).toBe(false);
    expect(v?.issues).toHaveLength(1);
  });

  it("applies verification issues to dataset notes", () => {
    const verification = {
      isValid: false,
      issues: ["Missing values in column B"],
      suggestions: [],
      verifiedBy: "minimax-m3" as const,
    };
    const updated = applyVerificationToDataset(sampleDataset, verification);
    expect(updated.verification?.issues).toHaveLength(1);
    expect(updated.notes?.some((n) => n.includes("Verification flagged"))).toBe(
      true
    );
  });

  it("normalizes verified multi-table payload", () => {
    const vt = normalizeVerifiedTable(sampleDataset, {
      tableId: "ds-1",
      category: "Financial Metrics",
      qualityScore: 0.9,
      issues: [],
      cleanedDataset: {
        columns: sampleDataset.columns,
        rows: sampleDataset.rows.map((r) => ({ values: r.values })),
      },
    }, 0);

    expect(vt.category).toBe("Financial Metrics");
    expect(vt.cleanedDataset.rows).toHaveLength(2);
  });

  it("falls back when LLM unavailable", () => {
    const tables = fallbackVerifiedTables([sampleDataset]);
    expect(tables[0].category).toBe("Other");
    expect(tables[0].cleanedDataset.id).toBe("ds-1");
  });
});

describe("llmChartRecommender", () => {
  it("normalizes LLM recommendations with valid column keys", () => {
    const recs = normalizeLlmRecommendations(sampleDataset, {
      recommendations: [
        {
          chartType: "horizontal_bar",
          title: "Score by Bank",
          reason: "Compare scores across banks",
          xKey: "col1",
          yKey: "col0",
          confidence: 0.92,
        },
        {
          chartType: "horizontal_bar",
          title: "Bad",
          reason: "Invalid keys",
          xKey: "missing",
          yKey: "col0",
        },
      ],
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].xKey).toBe("col1");
    expect(recs[0].generationMethod).toBe("minimax-m3");
  });
});
