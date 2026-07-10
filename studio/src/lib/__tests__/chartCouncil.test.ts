import { describe, it, expect } from "vitest";
import {
  EncodingStrategySchema,
  ChartPlanSchema,
} from "../agents/charting/schemas";
import { recommendChartsRulesAnnotated } from "../agents/charting/pipeline";
import { normalizeLlmRecommendations } from "../llmChartRecommender";
import type { DatasetColumn, ExtractedDataset } from "@/types";

function makeDataset(
  columns: DatasetColumn[],
  rows: Record<string, string | number | null>[]
): ExtractedDataset {
  return {
    id: "t1",
    name: "notes — Adoption by Institution",
    sourceType: "file",
    extractionMethod: "test",
    columns,
    rows: rows.map((values, i) => ({ id: `r${i}`, values })),
  };
}

const multiMetricDs = makeDataset(
  [
    { key: "col0", label: "Institution Type", type: "string" },
    { key: "col1", label: "Adoption (%)", type: "percentage" },
    { key: "col2", label: "Planning to Scale (%)", type: "percentage" },
    { key: "col3", label: "AI Budget ($M)", type: "currency" },
  ],
  [
    { col0: "Global banks", col1: 87, col2: 64, col3: 120 },
    { col0: "Fintechs", col1: 79, col2: 70, col3: 25 },
    { col0: "Insurers", col1: 54, col2: 41, col3: 40 },
  ]
);

describe("chart council schemas", () => {
  it("parses encoding strategy with defaults", () => {
    const parsed = EncodingStrategySchema.parse({
      mustEncodeMeasures: ["col1", "col2"],
      requireMultiMetricChart: true,
      preferredGoals: ["multi_metric"],
    });
    expect(parsed.mustEncodeMeasures).toEqual(["col1", "col2"]);
    expect(parsed.dropColumns).toEqual([]);
  });

  it("parses plan items missing usedColumns", () => {
    const parsed = ChartPlanSchema.parse({
      recommendations: [
        {
          chartType: "grouped_bar",
          title: "All metrics",
          reason: "show all",
          xKey: "col0",
          yKey: "col1",
          valueKeys: ["col1", "col2", "col3"],
          confidence: 0.9,
        },
      ],
    });
    expect(parsed.recommendations[0].valueKeys).toHaveLength(3);
  });
});

describe("coverage annotation", () => {
  it("annotates used and unused columns on rules recommendations", () => {
    const recs = recommendChartsRulesAnnotated(multiMetricDs);
    expect(recs.length).toBeGreaterThan(0);
    const withCoverage = recs.find((r) => r.usedColumns && r.unusedColumns);
    expect(withCoverage).toBeDefined();
    expect(
      (withCoverage!.usedColumns?.length ?? 0) +
        (withCoverage!.unusedColumns?.length ?? 0)
    ).toBe(multiMetricDs.columns.length);
  });

  it("preserves multi-metric valueKeys from LLM payload and annotates coverage", () => {
    const recs = normalizeLlmRecommendations(multiMetricDs, {
      recommendations: [
        {
          chartType: "grouped_bar",
          title: "All metrics by institution",
          reason: "Encode all measures",
          xKey: "col0",
          yKey: "col1",
          valueKeys: ["col1", "col2", "col3"],
          confidence: 0.95,
        },
        {
          chartType: "horizontal_bar",
          title: "Adoption only",
          reason: "Single KPI companion",
          xKey: "col1",
          yKey: "col0",
          confidence: 0.7,
          unusedJustification: "Companion chart; full metrics in grouped bar",
        },
      ],
    });

    const grouped = recs.find((r) => r.chartType === "grouped_bar");
    expect(grouped?.valueKeys?.length).toBeGreaterThanOrEqual(2);
    expect(grouped?.usedColumns).toContain("col0");
    expect(grouped?.encodingCoverage).toBeGreaterThan(0.5);

    const single = recs.find((r) => r.chartType === "horizontal_bar");
    expect(single?.unusedColumns?.length).toBeGreaterThan(0);
  });
});
