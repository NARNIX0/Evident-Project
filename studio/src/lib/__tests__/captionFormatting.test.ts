import { describe, it, expect } from "vitest";
import { formatCaptionMarkdown, parseCaptionPayload } from "../captionFormatting";
import type { GeneratedCaption } from "@/types";

const sampleCaption: GeneratedCaption = {
  headline: "Total Bookings by City",
  extractedFacts: ["Paris leads with 3.3M Total Bookings."],
  interpretation: ["European city demand is concentrated in top destinations."],
  caveats: ["Verify OCR-extracted values before external use."],
  sourceNote: "Source file: table.png (azure-document-intelligence)",
  generationMethod: "rules-fallback",
};

describe("formatCaptionMarkdown", () => {
  it("includes distinct sections for facts, interpretation, and caveats", () => {
    const markdown = formatCaptionMarkdown(sampleCaption);

    expect(markdown).toContain("## Total Bookings by City");
    expect(markdown).toContain("### Extracted facts");
    expect(markdown).toContain("### Interpretation");
    expect(markdown).toContain("### Caveats");
    expect(markdown).toContain("*Source file:");
  });
});

describe("parseCaptionPayload", () => {
  it("parses JSON wrapped in markdown fences", () => {
    const payload = parseCaptionPayload(
      '```json\n{"headline":"Test","extractedFacts":["fact"]}\n```'
    );

    expect(payload?.headline).toBe("Test");
    expect(payload?.extractedFacts).toEqual(["fact"]);
  });
});
