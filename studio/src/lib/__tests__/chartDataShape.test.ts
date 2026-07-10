import { describe, it, expect } from "vitest";
import {
  getYearMetricColumns,
  inferSharedMetricLabel,
  pivotYearMetricsForLines,
  resolveYAxisLabel,
} from "../chartDataShape";
import type { ExtractedDataset } from "@/types";

function talentDataset(): ExtractedDataset {
  return {
    id: "talent",
    name: "AI Talent Headcount",
    sourceType: "pasted",
    extractionMethod: "test",
    columns: [
      { key: "region", label: "Region", type: "string" },
      { key: "fte2023", label: "2023 FTEs", type: "number" },
      { key: "fte2024", label: "2024 FTEs", type: "number" },
      { key: "fte2025", label: "2025 FTEs", type: "number" },
      { key: "pct", label: "% Change", type: "percentage" },
    ],
    rows: [
      {
        id: "r0",
        values: {
          region: "North America",
          fte2023: 1200,
          fte2024: 1450,
          fte2025: 1780,
          pct: 22.5,
        },
      },
      {
        id: "r1",
        values: {
          region: "Europe",
          fte2023: 980,
          fte2024: 1100,
          fte2025: 1320,
          pct: 18.2,
        },
      },
    ],
  };
}

describe("chartDataShape", () => {
  it("detects year metric columns in chronological order", () => {
    const ds = talentDataset();
    const yearCols = getYearMetricColumns(ds.columns);

    expect(yearCols.map((col) => col.key)).toEqual([
      "fte2023",
      "fte2024",
      "fte2025",
    ]);
  });

  it("infers shared metric label from year columns", () => {
    const ds = talentDataset();
    const yearCols = getYearMetricColumns(ds.columns);

    expect(inferSharedMetricLabel(yearCols)).toBe("FTEs");
  });

  it("pivots year metrics into one line per region", () => {
    const ds = talentDataset();
    const yearKeys = ["fte2023", "fte2024", "fte2025"];
    const pivoted = pivotYearMetricsForLines(ds, "region", yearKeys);

    expect(pivoted.xKey).toBe("year");
    expect(pivoted.yAxisLabel).toBe("FTEs");
    expect(pivoted.series).toEqual([
      { key: "North America", label: "North America" },
      { key: "Europe", label: "Europe" },
    ]);
    expect(pivoted.data).toEqual([
      {
        year: "2023",
        "North America": 1200,
        Europe: 980,
      },
      {
        year: "2024",
        "North America": 1450,
        Europe: 1100,
      },
      {
        year: "2025",
        "North America": 1780,
        Europe: 1320,
      },
    ]);
  });

  it("resolves y-axis label from valueKeys instead of a single year column", () => {
    const ds = talentDataset();
    const yearKeys = ["fte2023", "fte2024", "fte2025"];

    expect(
      resolveYAxisLabel({ yKey: "fte2025" }, ds.columns, yearKeys)
    ).toBe("FTEs");
    expect(
      resolveYAxisLabel({ yAxisLabel: "Headcount" }, ds.columns, yearKeys)
    ).toBe("Headcount");
  });
});
