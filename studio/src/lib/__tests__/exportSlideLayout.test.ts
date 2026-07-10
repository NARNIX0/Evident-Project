import { describe, it, expect } from "vitest";
import {
  SLIDE_16X9,
  getSlideLayoutRegions,
  layoutFitsSlide,
  regionBottom,
} from "../exportSlideLayout";

describe("exportSlideLayout", () => {
  it("uses 16:9 slide height", () => {
    expect(SLIDE_16X9.height).toBe(5.625);
  });

  it("keeps chart+caption layout inside the slide canvas", () => {
    const regions = getSlideLayoutRegions("chart_and_caption");
    expect(layoutFitsSlide(regions, "chart_and_caption")).toBe(true);
    expect(regionBottom(regions.chart)).toBeGreaterThan(3.5);
    expect(regionBottom(regions.source)).toBeLessThanOrEqual(SLIDE_16X9.height);
  });

  it("keeps chart-only layout inside the slide with a larger chart region", () => {
    const full = getSlideLayoutRegions("chart_and_caption");
    const chartOnly = getSlideLayoutRegions("chart_only");
    expect(layoutFitsSlide(chartOnly, "chart_only")).toBe(true);
    expect(chartOnly.chart.h).toBeGreaterThan(full.chart.h);
    expect(chartOnly.bullets.h).toBe(0);
  });
});
