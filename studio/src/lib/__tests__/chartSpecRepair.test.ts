import { describe, it, expect } from "vitest";
import { validateAndRepairRecommendation, validateRecommendations } from "../chartSpec";
import type { ChartRecommendation, ExtractedDataset } from "@/types";

function quarterlyRiskDataset(): ExtractedDataset {
  return {
    id: "risk",
    name: "Model Risk and Compliance Metrics – 2025 Quarterly",
    sourceType: "file",
    extractionMethod: "test",
    columns: [
      { key: "col0", label: "Metric", type: "string" },
      { key: "col1", label: "Q1", type: "number" },
      { key: "col2", label: "Q2", type: "number" },
      { key: "col3", label: "Q3", type: "number" },
      { key: "col4", label: "Q4", type: "number" },
      { key: "col5", label: "Target", type: "number" },
    ],
    rows: [
      {
        id: "r0",
        values: {
          col0: "Models in production",
          col1: 1500,
          col2: 1550,
          col3: 1600,
          col4: 1670,
          col5: 1700,
        },
      },
      {
        id: "r1",
        values: {
          col0: "High-risk models",
          col1: 200,
          col2: 210,
          col3: 230,
          col4: 241,
          col5: 200,
        },
      },
    ],
  };
}

describe("chartSpec quarterly / bad line repair", () => {
  it("converts mis-encoded line (Q1 on X) into grouped_bar", () => {
    const ds = quarterlyRiskDataset();
    const bad: ChartRecommendation = {
      chartType: "line",
      title: "Quarterly metrics",
      reason: "Recommended based on data shape.",
      xKey: "col1",
      yKey: "col0",
      valueKeys: ["col1", "col2", "col3", "col4", "col5"],
      confidence: 0.7,
    };
    const result = validateAndRepairRecommendation(ds, bad);
    expect(result.ok).toBe(true);
    expect(result.recommendation.chartType).toBe("grouped_bar");
    expect(result.recommendation.xKey).toBe("col0");
    expect(result.recommendation.valueKeys?.length).toBeGreaterThanOrEqual(2);
  });

  it("does not return duplicate grouped_bar encodings", () => {
    const ds = quarterlyRiskDataset();
    const twinA: ChartRecommendation = {
      chartType: "grouped_bar",
      title: "A",
      reason: "one",
      xKey: "col0",
      yKey: "col1",
      valueKeys: ["col1", "col2", "col3", "col4"],
      confidence: 0.95,
    };
    const twinB: ChartRecommendation = {
      ...twinA,
      title: "B",
      reason: "two",
      confidence: 0.86,
    };
    const out = validateRecommendations(ds, [twinA, twinB]);
    expect(out.filter((r) => r.chartType === "grouped_bar")).toHaveLength(1);
  });
});
