import { describe, it, expect } from "vitest";
import {
  filterRenderableRows,
  prepareChartView,
  isRecommendationRenderable,
} from "../chartRenderGuard";
import type { ChartRecommendation, ExtractedDataset } from "@/types";

function talentDataset(): ExtractedDataset {
  return {
    id: "talent",
    name: "AI Talent Headcount Trends",
    sourceType: "file",
    extractionMethod: "test",
    columns: [
      { key: "col0", label: "Region", type: "string" },
      { key: "col1", label: "2023 FTEs", type: "number" },
      { key: "col2", label: "2024 FTEs", type: "number" },
      { key: "col3", label: "2025 FTEs", type: "number" },
    ],
    rows: [
      {
        id: "r0",
        values: {
          col0: "North America",
          col1: 1200,
          col2: 1450,
          col3: 1780,
        },
      },
      {
        id: "r1",
        values: { col0: "Europe", col1: 980, col2: 1100, col3: 1320 },
      },
      {
        id: "r2",
        values: {
          col0: "Asia Pacific",
          col1: 700,
          col2: 820,
          col3: 950,
        },
      },
      {
        id: "r3",
        values: {
          col0: "Latin America",
          col1: 200,
          col2: 240,
          col3: 280,
        },
      },
    ],
  };
}

const yearPivotRec: ChartRecommendation = {
  chartType: "line",
  title: "FTEs by Region (2023–2025)",
  reason: "Trend across years",
  xKey: "year",
  yKey: "col1",
  valueKeys: ["col1", "col2", "col3"],
  categoryKey: "col0",
  chartLayout: "year_pivot_lines",
  yAxisLabel: "FTEs",
  confidence: 0.92,
};

describe("chartRenderGuard", () => {
  it("does not drop year-pivot rows when filtering by source yKey", () => {
    const pivoted = [
      { year: "2023", "North America": 1200, Europe: 980 },
      { year: "2024", "North America": 1450, Europe: 1100 },
    ];
    // Bug reproduction: filtering on yKey=col1 would wipe all rows
    const wrong = pivoted.filter(
      (d) =>
        d["col1" as keyof typeof d] !== null &&
        d["col1" as keyof typeof d] !== undefined &&
        d.year !== null
    );
    expect(wrong).toHaveLength(0);

    const right = filterRenderableRows(pivoted, {
      xKey: "year",
      yKey: "col1",
      seriesKeys: ["North America", "Europe"],
    });
    expect(right).toHaveLength(2);
  });

  it("prepares a renderable year-pivot line chart for talent headcount", () => {
    const view = prepareChartView(talentDataset(), yearPivotRec);
    expect(view.renderable).toBe(true);
    expect(view.data.length).toBe(3);
    expect(view.lineSeries?.map((s) => s.key)).toEqual([
      "North America",
      "Europe",
      "Asia Pacific",
      "Latin America",
    ]);
    expect(view.data[0]).toMatchObject({
      year: "2023",
      "North America": 1200,
      Europe: 980,
    });
  });

  it("falls back to grouped_bar when year-pivot series keys are empty", () => {
    const emptyCats: ExtractedDataset = {
      ...talentDataset(),
      rows: talentDataset().rows.map((r) => ({
        ...r,
        values: { ...r.values, col0: null },
      })),
    };
    const view = prepareChartView(emptyCats, yearPivotRec);
    // No category labels → not renderable as lines; grouped bar also needs categories
    expect(view.renderable).toBe(false);
  });

  it("rejects empty recommendations via isRecommendationRenderable", () => {
    const empty: ExtractedDataset = {
      ...talentDataset(),
      rows: [],
    };
    expect(isRecommendationRenderable(empty, yearPivotRec)).toBe(false);
  });

  it("prepares ranked horizontal_bar with metric on xKey and category on yKey", () => {
    const rec: ChartRecommendation = {
      chartType: "horizontal_bar",
      title: "2025 FTEs by Region",
      reason: "Ranked headcount",
      xKey: "col3",
      yKey: "col0",
      confidence: 0.9,
    };
    const view = prepareChartView(talentDataset(), rec);
    expect(view.renderable).toBe(true);
    expect(view.data.length).toBe(4);
    expect(view.xKey).toBe("col3");
    expect(view.yKey).toBe("col0");
    // Filtering must use the metric (xKey), not category labels as series
    expect(view.data.every((d) => !Number.isNaN(Number(d.col3)))).toBe(true);
  });
});
