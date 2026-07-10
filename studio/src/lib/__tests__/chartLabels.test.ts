import { describe, it, expect } from "vitest";
import {
  formatDataLabel,
  formatCompositionTooltip,
  formatPiePercent,
  sortPieData,
} from "../chartLabels";

describe("chartLabels", () => {
  it("formats percentage column labels", () => {
    expect(formatDataLabel(18, "percentage")).toBe("18%");
  });

  it("formats numeric labels with axis shorthand", () => {
    expect(formatDataLabel(1840, "number")).toBe("1.8K");
  });

  it("hides tiny pie slice labels", () => {
    expect(formatPiePercent(0.03)).toBeNull();
    expect(formatPiePercent(0.18)).toBe("18%");
  });

  it("includes share in composition tooltips", () => {
    expect(formatCompositionTooltip(184, 0.184, "number")).toBe(
      "184 (18.4%)"
    );
  });

  it("computes share from total when percent is missing", () => {
    expect(formatCompositionTooltip(18, 0, "number", 70)).toBe("18 (25.7%)");
  });

  it("sorts pie slices largest first", () => {
    const sorted = sortPieData([
      { name: "B", value: 10 },
      { name: "A", value: 50 },
    ]);
    expect(sorted[0].name).toBe("A");
  });
});
