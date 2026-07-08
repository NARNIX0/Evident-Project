import { describe, it, expect } from "vitest";
import { recommendCharts } from "../chartRecommender";
import type { ExtractedDataset } from "@/types";

function makeDataset(
  columns: { key: string; label: string; type: "string" | "number" | "percentage" }[],
  rows: Record<string, string | number | null>[]
): ExtractedDataset {
  return {
    id: "test",
    name: "Test",
    sourceType: "demo",
    extractionMethod: "test",
    columns,
    rows: rows.map((values, i) => ({ id: `r${i}`, values })),
  };
}

describe("recommendCharts", () => {
  it("returns empty for empty dataset", () => {
    const ds = makeDataset(
      [
        { key: "name", label: "Name", type: "string" },
        { key: "value", label: "Value", type: "number" },
      ],
      []
    );
    expect(recommendCharts(ds)).toEqual([]);
  });

  it("recommends horizontal bar for ranked categories", () => {
    const ds = makeDataset(
      [
        { key: "bank", label: "Bank", type: "string" },
        { key: "score", label: "AI Score", type: "number" },
      ],
      [
        { bank: "JPM", score: 82 },
        { bank: "GS", score: 78 },
        { bank: "MS", score: 74 },
        { bank: "Citi", score: 70 },
      ]
    );

    const recs = recommendCharts(ds);
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0].chartType).toBe("horizontal_bar");
    expect(recs[0].confidence).toBeGreaterThan(0.5);
  });

  it("recommends grouped bar when multiple numeric columns", () => {
    const ds = makeDataset(
      [
        { key: "bank", label: "Bank", type: "string" },
        { key: "score", label: "Score", type: "number" },
        { key: "invest", label: "Investment", type: "number" },
      ],
      [
        { bank: "JPM", score: 82, invest: 430 },
        { bank: "GS", score: 78, invest: 380 },
        { bank: "MS", score: 74, invest: 310 },
      ]
    );

    const recs = recommendCharts(ds);
    const grouped = recs.find((r) => r.chartType === "grouped_bar");
    expect(grouped).toBeDefined();
  });

  it("recommends line chart for time-series data", () => {
    const ds = makeDataset(
      [
        { key: "quarter", label: "Quarter", type: "string" },
        { key: "patents", label: "Patents", type: "number" },
      ],
      [
        { quarter: "Q1 2023", patents: 12 },
        { quarter: "Q2 2023", patents: 15 },
        { quarter: "Q3 2023", patents: 18 },
        { quarter: "Q4 2023", patents: 22 },
      ]
    );

    const recs = recommendCharts(ds);
    const line = recs.find((r) => r.chartType === "line");
    expect(line).toBeDefined();
    expect(line?.confidence).toBeGreaterThan(0.5);
  });

  it("recommends donut for percentage/category data", () => {
    const ds = makeDataset(
      [
        { key: "category", label: "Category", type: "string" },
        { key: "share", label: "% of Deployments", type: "percentage" },
      ],
      [
        { category: "Chatbots", share: 28 },
        { category: "Fraud", share: 22 },
        { category: "OCR", share: 18 },
        { category: "Risk", share: 14 },
        { category: "Research", share: 10 },
      ]
    );

    const recs = recommendCharts(ds);
    const donut = recs.find((r) => r.chartType === "donut");
    expect(donut).toBeDefined();
  });

  it("returns at most 4 recommendations", () => {
    const ds = makeDataset(
      [
        { key: "q", label: "Quarter", type: "string" },
        { key: "a", label: "A", type: "number" },
        { key: "b", label: "B", type: "number" },
      ],
      [
        { q: "Q1 2023", a: 12, b: 8 },
        { q: "Q2 2023", a: 15, b: 10 },
        { q: "Q3 2023", a: 18, b: 11 },
        { q: "Q4 2023", a: 22, b: 14 },
      ]
    );

    const recs = recommendCharts(ds);
    expect(recs.length).toBeLessThanOrEqual(4);
  });
});
