import { describe, it, expect } from "vitest";
import {
  normalizeHorizontalBarKeys,
  pickComparisonMetric,
  pickCompositionMetric,
} from "../chartMetricSelection";
import type { DatasetColumn } from "@/types";

const cols: DatasetColumn[] = [
  { key: "col0", label: "Use Case", type: "string" },
  { key: "col1", label: "2025 Spend ($M)", type: "currency" },
  { key: "col2", label: "Share of Total (%)", type: "percentage" },
  { key: "col3", label: "Adoption in Core Processes (%)", type: "percentage" },
];

describe("chartMetricSelection", () => {
  it("prefers spend over share for composition charts", () => {
    const metric = pickCompositionMetric(cols.slice(1));
    expect(metric?.key).toBe("col1");
  });

  it("prefers adoption metric for comparison charts", () => {
    const adoptionCols: DatasetColumn[] = [
      { key: "col0", label: "Institution Type", type: "string" },
      { key: "col1", label: "Adoption in Core Processes (%)", type: "percentage" },
      { key: "col2", label: "Planning to Scale (%)", type: "percentage" },
    ];
    const metric = pickComparisonMetric(adoptionCols.slice(1), adoptionCols[0]);
    expect(metric?.key).toBe("col1");
  });

  it("swaps horizontal bar axes when category is on xKey", () => {
    const swapped = normalizeHorizontalBarKeys("col0", "col3", cols);
    expect(swapped).toEqual({ xKey: "col3", yKey: "col0" });
  });
});
