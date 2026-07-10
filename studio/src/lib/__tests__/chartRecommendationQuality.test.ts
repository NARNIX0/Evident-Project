import { describe, it, expect } from "vitest";
import {
  dedupeAndScoreRecommendations,
  recommendationDedupeKey,
  scoreRecommendationConfidence,
} from "../chartRecommendationQuality";
import type { ChartRecommendation, ExtractedDataset } from "@/types";

function spendDataset(): ExtractedDataset {
  return {
    id: "spend",
    name: "2025 AI Investment by Use Case",
    sourceType: "file",
    extractionMethod: "test",
    columns: [
      { key: "col0", label: "Use Case", type: "string" },
      { key: "col1", label: "2025 Spend ($M)", type: "currency" },
      { key: "col2", label: "YoY Growth (%)", type: "percentage" },
      { key: "col3", label: "Share of Total (%)", type: "percentage" },
    ],
    rows: [
      {
        id: "r0",
        values: { col0: "Fraud", col1: 120, col2: 18, col3: 25 },
      },
      {
        id: "r1",
        values: { col0: "Credit", col1: 90, col2: 12, col3: 19 },
      },
    ],
  };
}

describe("chartRecommendationQuality", () => {
  it("dedupes identical encodings keeping one card", () => {
    const ds = spendDataset();
    const a: ChartRecommendation = {
      chartType: "grouped_bar",
      title: "Spend and growth",
      reason: "Pair absolute and YoY",
      xKey: "col0",
      yKey: "col1",
      valueKeys: ["col1", "col2"],
      confidence: 0.95,
    };
    const b: ChartRecommendation = {
      ...a,
      title: "Spend and growth (labels)",
      reason: "Same encoding with labels",
      confidence: 0.86,
    };
    expect(recommendationDedupeKey(a)).toBe(recommendationDedupeKey(b));
    const out = dedupeAndScoreRecommendations(ds, [a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].chartType).toBe("grouped_bar");
  });

  it("scores confidence from coverage and type — not a flat 0.7", () => {
    const ds = spendDataset();
    const ranked: ChartRecommendation = {
      chartType: "horizontal_bar",
      title: "2025 Spend by Use Case",
      reason: "Ranked spend",
      xKey: "col1",
      yKey: "col0",
      confidence: 0.7,
    };
    const score = scoreRecommendationConfidence(ds, ranked);
    expect(score).toBeGreaterThan(0.5);
    expect(score).not.toBe(0.7);
  });
});
