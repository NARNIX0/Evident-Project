import { describe, it, expect } from "vitest";
import {
  buildSlideBulletText,
  buildSlideCaptionBlock,
} from "../exportSlideContent";
import type { GeneratedCaption } from "@/types";

const caption: GeneratedCaption = {
  headline: "Total Bookings by City",
  extractedFacts: [
    "Paris leads with 3.3M Total Bookings.",
    "Prague is lowest at 1.8M Total Bookings.",
    "Extra fact that should be trimmed.",
  ],
  interpretation: [
    "Demand is concentrated in major European destinations.",
    "Second interpretation.",
  ],
  caveats: [
    "Verify OCR-extracted values before external use.",
    "Second caveat.",
  ],
  sourceNote: "Source file: table.png (azure-document-intelligence)",
  generationMethod: "rules-fallback",
};

describe("buildSlideCaptionBlock", () => {
  it("keeps slide copy concise", () => {
    const block = buildSlideCaptionBlock(caption);

    expect(block.headline).toBe("Total Bookings by City");
    expect(block.bullets).toHaveLength(3);
    expect(block.bullets[0]).toContain("Paris");
    expect(block.caveat).toBe(
      "Verify OCR-extracted values before external use."
    );
  });
});

describe("buildSlideBulletText", () => {
  it("formats bullets and caveat for pptx text box", () => {
    const text = buildSlideBulletText(buildSlideCaptionBlock(caption));

    expect(text).toContain("• Paris leads");
    expect(text).toContain("Note: Verify OCR-extracted");
  });
});
