/** 16:9 slide dimensions in inches (pptxgen `LAYOUT_16x9`). */
export const SLIDE_16X9 = {
  width: 10,
  height: 5.625,
  marginX: 0.45,
  contentWidth: 9.1,
} as const;

export type SlideLayoutMode = "chart_and_caption" | "chart_only";

export interface SlideRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SlideLayoutRegions {
  accent: SlideRegion;
  title: SlideRegion;
  chart: SlideRegion;
  headline: SlideRegion;
  bullets: SlideRegion;
  source: SlideRegion;
}

export function getSlideLayoutRegions(
  mode: SlideLayoutMode = "chart_and_caption"
): SlideLayoutRegions {
  const { marginX: x, contentWidth: w } = SLIDE_16X9;

  if (mode === "chart_only") {
    return {
      accent: { x, y: 0.16, w: 0.95, h: 0.045 },
      title: { x, y: 0.24, w, h: 0.34 },
      chart: { x, y: 0.62, w, h: 4.55 },
      headline: { x, y: 0, w: 0, h: 0 },
      bullets: { x, y: 0, w: 0, h: 0 },
      source: { x, y: 5.28, w, h: 0.28 },
    };
  }

  return {
    accent: { x, y: 0.16, w: 0.95, h: 0.045 },
    title: { x, y: 0.24, w, h: 0.32 },
    chart: { x, y: 0.6, w, h: 3.05 },
    headline: { x, y: 3.72, w, h: 0.24 },
    bullets: { x, y: 3.98, w, h: 1.1 },
    source: { x, y: 5.15, w, h: 0.35 },
  };
}

export function regionBottom(region: SlideRegion): number {
  return region.y + region.h;
}

export function layoutFitsSlide(
  regions: SlideLayoutRegions,
  mode: SlideLayoutMode = "chart_and_caption"
): boolean {
  const relevant =
    mode === "chart_only"
      ? [regions.accent, regions.title, regions.chart, regions.source]
      : Object.values(regions);
  const maxBottom = Math.max(...relevant.map(regionBottom));
  return maxBottom <= SLIDE_16X9.height + 0.001;
}
