/** Shared table categories for structuring and validation agents. */
export const EXTRACTION_TABLE_CATEGORIES = [
  "Action Items",
  "Attendees & Participants",
  "Decisions",
  "Discussion Topics",
  "Metrics & KPIs",
  "Timeline & Dates",
  "Financial Metrics",
  "Headcount & Talent",
  "Investment & Budget",
  "Risk & Compliance",
  "Other",
] as const;

export type ExtractionTableCategory =
  (typeof EXTRACTION_TABLE_CATEGORIES)[number];
