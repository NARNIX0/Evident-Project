import { describe, it, expect } from "vitest";
import {
  buildCaptionContext,
  generateFallbackCaption,
  normalizeCaptionPayload,
  captionReferencesUnknownNumbers,
} from "../captionService";
import type { ExtractedDataset, ChartRecommendation } from "@/types";

const hotelDataset: ExtractedDataset = {
  id: "hotel",
  name: "Top 10 cities for hotel bookings table",
  sourceType: "file",
  sourceName: "Top 10 cities.png",
  sourcePage: 1,
  extractionMethod: "azure-document-intelligence",
  columns: [
    { key: "col0", label: "Rank", type: "number" },
    { key: "col1", label: "City", type: "string" },
    { key: "col2", label: "Total Bookings", type: "number" },
  ],
  rows: [
    { id: "r1", values: { col0: 1, col1: "Paris", col2: 3250000 } },
    { id: "r2", values: { col0: 2, col1: "London", col2: 2870000 } },
    { id: "r3", values: { col0: 3, col1: "Prague", col2: 1770000 } },
  ],
};

const recommendation: ChartRecommendation = {
  chartType: "horizontal_bar",
  title: "Total Bookings by City",
  reason: "test",
  xKey: "col2",
  yKey: "col1",
  confidence: 0.9,
};

describe("buildCaptionContext", () => {
  it("identifies metric and category columns from chart mapping", () => {
    const context = buildCaptionContext(hotelDataset, recommendation);

    expect(context.metricKey).toBe("col2");
    expect(context.categoryKey).toBe("col1");
    expect(context.sourceNote).toContain("Top 10 cities.png");
  });
});

describe("generateFallbackCaption", () => {
  it("uses city names and booking values in extracted facts", () => {
    const context = buildCaptionContext(hotelDataset, recommendation);
    const caption = generateFallbackCaption(context);

    expect(caption.headline).toBe("Total Bookings by City");
    expect(caption.extractedFacts.join(" ")).toContain("Paris");
    expect(caption.extractedFacts.join(" ")).toContain("Prague");
    expect(caption.caveats.length).toBeGreaterThan(0);
    expect(caption.generationMethod).toBe("rules-fallback");
  });
});

describe("normalizeCaptionPayload", () => {
  it("requires headline and extracted facts", () => {
    const context = buildCaptionContext(hotelDataset, recommendation);
    const caption = normalizeCaptionPayload(
      { headline: "Test", extractedFacts: ["Paris leads with 3,250,000 bookings."] },
      context
    );

    expect(caption?.headline).toBe("Test");
    expect(caption?.generationMethod).toBe("minimax-m3");
  });
});

describe("captionReferencesUnknownNumbers", () => {
  it("flags invented large numbers", () => {
    const context = buildCaptionContext(hotelDataset, recommendation);
    const caption = generateFallbackCaption(context);
    caption.extractedFacts = ["A total of 99999999 bookings were recorded."];

    expect(captionReferencesUnknownNumbers(caption, hotelDataset)).toBe(true);
  });

  it("allows numbers present in the dataset", () => {
    const context = buildCaptionContext(hotelDataset, recommendation);
    const caption = generateFallbackCaption(context);
    caption.extractedFacts = ["Paris has 3250000 total bookings."];

    expect(captionReferencesUnknownNumbers(caption, hotelDataset)).toBe(false);
  });
});
