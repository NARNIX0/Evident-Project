import type { GeneratedCaption } from "@/types";

export function formatCaptionMarkdown(caption: GeneratedCaption): string {
  const lines = [
    `## ${caption.headline}`,
    "",
    "### Extracted facts",
    ...caption.extractedFacts.map((fact) => `- ${fact}`),
    "",
    "### Interpretation",
    ...(caption.interpretation.length > 0
      ? caption.interpretation.map((line) => `- ${line}`)
      : ["- No additional interpretation provided."]),
    "",
    "### Caveats",
    ...caption.caveats.map((line) => `- ${line}`),
    "",
    `*${caption.sourceNote}*`,
  ];

  return lines.join("\n");
}

export interface RawCaptionPayload {
  headline?: string;
  extractedFacts?: string[];
  interpretation?: string[];
  caveats?: string[];
}

export function parseCaptionPayload(raw: string): RawCaptionPayload | null {
  const trimmed = raw.trim();
  const jsonText = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(jsonText) as RawCaptionPayload;
  } catch {
    return null;
  }
}
