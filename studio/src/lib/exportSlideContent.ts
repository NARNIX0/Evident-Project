import type { GeneratedCaption } from "@/types";

const MAX_FACTS = 2;
const MAX_INTERPRETATION = 1;
const MAX_CAVEATS = 1;

export interface SlideCaptionBlock {
  headline: string;
  bullets: string[];
  caveat?: string;
  sourceNote: string;
}

export function buildSlideCaptionBlock(
  caption: GeneratedCaption
): SlideCaptionBlock {
  const bullets = [
    ...caption.extractedFacts.slice(0, MAX_FACTS),
    ...caption.interpretation.slice(0, MAX_INTERPRETATION),
  ];

  return {
    headline: caption.headline,
    bullets,
    caveat: caption.caveats[0],
    sourceNote: caption.sourceNote,
  };
}

export function buildSlideBulletText(block: SlideCaptionBlock): string {
  const lines = block.bullets.map((bullet) => `• ${bullet}`);
  if (block.caveat) {
    lines.push(`Note: ${block.caveat}`);
  }
  return lines.join("\n");
}
