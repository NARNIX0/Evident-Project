import { describe, it, expect } from "vitest";
import {
  chartHoverCursor,
  groupKeysByScale,
  paddedDomain,
} from "../chartAxisDomain";
import type { DatasetColumn } from "@/types";

describe("chartAxisDomain", () => {
  it("pads domain so values above 100 are not clipped at 100", () => {
    const data = [
      { budget: 127 },
      { budget: 110 },
      { budget: 45 },
    ];
    const [min, max] = paddedDomain(data, ["budget"]);
    expect(min).toBe(0);
    expect(max).toBeGreaterThan(127);
  });

  it("detects mixed percentage and currency scales", () => {
    const columns: DatasetColumn[] = [
      { key: "col0", label: "Institution", type: "string" },
      { key: "col1", label: "% Using AI", type: "percentage" },
      { key: "col2", label: "% Planning to Scale", type: "percentage" },
      { key: "col3", label: "Average Budget ($M)", type: "currency" },
    ];
    const groups = groupKeysByScale(["col1", "col2", "col3"], columns);
    expect(groups.isMixed).toBe(true);
    expect(groups.percentKeys).toEqual(["col1", "col2"]);
    expect(groups.absoluteKeys).toEqual(["col3"]);
  });

  it("uses a translucent orange hover cursor on dark backgrounds", () => {
    const cursor = chartHoverCursor(true);
    expect(cursor.fill).toContain("255, 113, 41");
    expect(cursor.fill).not.toBe("#ccc");
    expect(cursor.fill).not.toBe("#CCCED6");
  });
});
