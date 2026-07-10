import { describe, it, expect } from "vitest";
import { profileTable } from "../tableProfiler";
import {
  validateAndRepairRecommendation,
  validateRecommendations,
  buildProfileAwareSeeds,
} from "../chartSpec";
import type { ExtractedDataset, DatasetColumn } from "@/types";

function makeDataset(
  columns: DatasetColumn[],
  rows: Record<string, string | number | null>[]
): ExtractedDataset {
  return {
    id: "t1",
    name: "notes — Test Table",
    sourceType: "file",
    extractionMethod: "test",
    columns,
    rows: rows.map((values, i) => ({ id: `r${i}`, values })),
  };
}

describe("tableProfiler", () => {
  it("identifies dimensions, measures, and composition candidates", () => {
    const ds = makeDataset(
      [
        { key: "col0", label: "Use Case", type: "string" },
        { key: "col1", label: "2025 Spend ($M)", type: "currency" },
        { key: "col2", label: "Share of Total (%)", type: "percentage" },
      ],
      [
        { col0: "Fraud", col1: 18, col2: 26 },
        { col0: "Credit risk", col1: 16, col2: 23 },
        { col0: "Onboarding", col1: 12, col2: 17 },
        { col0: "Reporting", col1: 9, col2: 13 },
        { col0: "Claims", col1: 8, col2: 11 },
        { col0: "Chatbots", col1: 7, col2: 10 },
      ]
    );

    const profile = profileTable(ds);
    expect(profile.primaryDimension?.key).toBe("col0");
    expect(profile.compositionMeasure?.key).toBe("col1");
    expect(profile.compositionCandidate).toBe(true);
    expect(profile.suggestedGoals).toContain("composition");
    expect(profile.suggestedGoals).toContain("comparison");
  });

  it("flags year metric groups for trend goals", () => {
    const ds = makeDataset(
      [
        { key: "col0", label: "Region", type: "string" },
        { key: "col1", label: "2023 FTEs", type: "number" },
        { key: "col2", label: "2024 FTEs", type: "number" },
        { key: "col3", label: "2025 FTEs", type: "number" },
      ],
      [
        { col0: "EMEA", col1: 100, col2: 120, col3: 140 },
        { col0: "APAC", col1: 80, col2: 90, col3: 110 },
        { col0: "Americas", col1: 200, col2: 220, col3: 250 },
      ]
    );

    const profile = profileTable(ds);
    expect(profile.yearMetrics).toHaveLength(3);
    expect(profile.suggestedGoals).toContain("trend");
    expect(profile.suggestedGoals).toContain("multi_metric");
  });
});

describe("chartSpec validator", () => {
  it("swaps horizontal bar axes when category is on xKey", () => {
    const ds = makeDataset(
      [
        { key: "col0", label: "Institution Type", type: "string" },
        { key: "col1", label: "Adoption (%)", type: "percentage" },
      ],
      [
        { col0: "Global banks", col1: 87 },
        { col0: "Fintechs", col1: 79 },
        { col0: "Regional banks", col1: 61 },
      ]
    );

    const result = validateAndRepairRecommendation(ds, {
      chartType: "horizontal_bar",
      title: "Adoption",
      reason: "test",
      xKey: "col0",
      yKey: "col1",
      confidence: 0.9,
    });

    expect(result.ok).toBe(true);
    expect(result.repaired).toBe(true);
    expect(result.recommendation.xKey).toBe("col1");
    expect(result.recommendation.yKey).toBe("col0");
  });

  it("repairs pie to use absolute spend instead of share %", () => {
    const ds = makeDataset(
      [
        { key: "col0", label: "Use Case", type: "string" },
        { key: "col1", label: "2025 Spend ($M)", type: "currency" },
        { key: "col2", label: "Share of Total (%)", type: "percentage" },
      ],
      [
        { col0: "Fraud", col1: 18, col2: 26 },
        { col0: "Credit", col1: 16, col2: 23 },
        { col0: "Onboarding", col1: 12, col2: 17 },
        { col0: "Reporting", col1: 9, col2: 13 },
      ]
    );

    const result = validateAndRepairRecommendation(ds, {
      chartType: "donut",
      title: "Share",
      reason: "test",
      xKey: "col0",
      yKey: "col2",
      confidence: 0.8,
    });

    expect(result.ok).toBe(true);
    expect(result.recommendation.yKey).toBe("col1");
  });

  it("enriches grouped_bar valueKeys with all comparable metrics", () => {
    const ds = makeDataset(
      [
        { key: "col0", label: "Institution", type: "string" },
        { key: "col1", label: "Adoption (%)", type: "percentage" },
        { key: "col2", label: "Planning to Scale (%)", type: "percentage" },
        { key: "col3", label: "AI Budget ($M)", type: "currency" },
      ],
      [
        { col0: "Banks", col1: 87, col2: 64, col3: 120 },
        { col0: "Insurers", col1: 54, col2: 41, col3: 40 },
        { col0: "Fintechs", col1: 79, col2: 70, col3: 25 },
      ]
    );

    const result = validateAndRepairRecommendation(ds, {
      chartType: "grouped_bar",
      title: "Metrics",
      reason: "test",
      xKey: "col0",
      yKey: "col1",
      confidence: 0.85,
    });

    expect(result.ok).toBe(true);
    expect(result.recommendation.valueKeys?.length).toBeGreaterThanOrEqual(2);
    expect(result.recommendation.valueKeys).toContain("col1");
  });

  it("drops recommendations with missing columns", () => {
    const ds = makeDataset(
      [
        { key: "col0", label: "Bank", type: "string" },
        { key: "col1", label: "Score", type: "number" },
      ],
      [
        { col0: "A", col1: 10 },
        { col0: "B", col1: 20 },
      ]
    );

    const kept = validateRecommendations(ds, [
      {
        chartType: "vertical_bar",
        title: "Good",
        reason: "ok",
        xKey: "col0",
        yKey: "col1",
        confidence: 0.9,
      },
      {
        chartType: "vertical_bar",
        title: "Bad",
        reason: "missing",
        xKey: "missing",
        yKey: "col1",
        confidence: 0.9,
      },
    ]);

    expect(kept).toHaveLength(1);
    expect(kept[0].title).toBe("Good");
  });

  it("builds profile-aware seeds for investment tables", () => {
    const ds = makeDataset(
      [
        { key: "col0", label: "Use Case", type: "string" },
        { key: "col1", label: "2025 Spend ($M)", type: "currency" },
        { key: "col2", label: "Share of Total (%)", type: "percentage" },
      ],
      [
        { col0: "Fraud", col1: 18, col2: 26 },
        { col0: "Credit", col1: 16, col2: 23 },
        { col0: "Onboarding", col1: 12, col2: 17 },
        { col0: "Reporting", col1: 9, col2: 13 },
        { col0: "Claims", col1: 8, col2: 11 },
        { col0: "Chatbots", col1: 7, col2: 10 },
      ]
    );

    const seeds = buildProfileAwareSeeds(ds);
    expect(seeds.some((s) => s.chartType === "horizontal_bar")).toBe(true);
    expect(seeds.some((s) => s.chartType === "donut")).toBe(true);
    const donut = seeds.find((s) => s.chartType === "donut");
    expect(donut?.yKey).toBe("col1");
  });
});
