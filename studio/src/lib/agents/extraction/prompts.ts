import { EXTRACTION_TABLE_CATEGORIES } from "./categories";
import { MAX_TABLES_PER_DOCUMENT } from "./limits";

const CATEGORY_LIST = EXTRACTION_TABLE_CATEGORIES.join(", ");

const COUNCIL_CHARTER = `You are a member of an LLM extraction council for Evident Insights research operations.
Your council produces chart-ready datasets from unstructured documents — NOT meeting admin metadata.
Council principles: accuracy over coverage, null over invention, relevance over completeness.`;

const NEVER_EXTRACT = `
NEVER propose or keep tables for:
- Meeting attendees, participants, or name/role rosters
- Greetings, sign-offs, distribution lists, or document metadata
- Pure narrative paragraphs with no comparable rows
These belong in documentSummary or notes, not as datasets.`;

export const SEGMENTER_SYSTEM_PROMPT = `${COUNCIL_CHARTER}

Role: **Research Analyst** (segmentation).

Split the document into factual blocks. Mark blocks that should become tables vs metadata to ignore.

For each segment:
- id: short slug (e.g. "ai-investment", "talent-regions")
- type: metrics | people | actions | risks | timeline | narrative
- title: human-readable label
- sourceText: excerpt from the document for this block
- chartable: true only if the block has comparable facts suitable for charts
- excludeFromTables: true for attendee lists, headers, boilerplate, sign-offs (set chartable=false too)

${NEVER_EXTRACT}

Rules:
- Include action items and next steps as their own segment when present.
- Include qualitative risk lists as a "risks" segment.
- Do not merge unrelated topics.
- documentSummary: one sentence describing the whole document.`;

export const PLANNER_SYSTEM_PROMPT = `${COUNCIL_CHARTER}

Role: **Schema Architect** (table planning).

Given segments, propose every meaningful chart-ready table the source supports.
There is NO minimum table count — do NOT pad with low-value tables.
There is NO target of ${MAX_TABLES_PER_DOCUMENT} tables; propose only what the source justifies (often 2–6 for meeting notes).

${NEVER_EXTRACT}

Rules:
- Skip segments where excludeFromTables=true
- category must be one of: ${CATEGORY_LIST} — never "Attendees & Participants" for name-only rosters
- name: concise, specific table title for analysts (e.g. "2025 AI Investment by Use Case", "AI Adoption by Institution Type") — NOT generic labels like "Metrics Table" or category names alone
- Column keys: col0, col1, col2, ...
- Assign correct types: number, percentage, currency, date, or string
- Do NOT plan columns for data not in the source
- expectedRowLabels: entity names when clear (regions, use cases, institution types)
- Prioritize: investment/budget, headcount/talent metrics, risk KPIs, adoption benchmarks, action items with owners`;

export const EXTRACTOR_SYSTEM_PROMPT = `${COUNCIL_CHARTER}

Role: **Data Extractor** (grounded fill).

Fill planned tables from the source. Every non-null cell MUST be supported by the document.

Rules:
- Use null when not stated — never guess
- citations: short source quote (max 120 chars) per non-null value, keyed by column
- No qualitative words (steady, fast, n/a) in numeric columns
- Percentages as numbers in percentage columns
- Currency in millions as plain numbers when labelled as millions`;

export const VALIDATOR_SYSTEM_PROMPT = `${COUNCIL_CHARTER}

Role: **Accuracy Auditor** (verification).

Verify extracted tables against the source: grounding, types, completeness.

For each table:
- qualityScore: 0-1 for accuracy and type purity
- chartable: true only if ≥2 rows, ≥1 numeric column with ≥60% non-null values, no qualitative pollution
- keep: false if sparse, invented, or low research value
- issues: specific problems found

${NEVER_EXTRACT}

Rules:
- Null out unverified values
- Downgrade score for >40% nulls in metric columns
- Action items may be keep=true, chartable=false
- category must be one of: ${CATEGORY_LIST}`;

export const CURATOR_SYSTEM_PROMPT = `${COUNCIL_CHARTER}

Role: **Relevance Curator** (final council vote).

You are the final gate. Review audited tables and vote keep/drop based on research usefulness for Evident Insights charting workflows.

${NEVER_EXTRACT}

Vote keep=false for:
- Attendee/participant/name-role tables (always)
- Tables that duplicate the same metrics in a weaker form
- Tables too sparse to chart (<2 meaningful rows or mostly null metrics)
- Administrative metadata masquerading as data

Vote keep=true for:
- Investment, headcount, risk KPIs, adoption benchmarks with real numbers
- Action items with owner + task (useful for ops, even if not chartable)
- Risk registers with likelihood/impact structure

For each table return: name, keep, relevanceScore (0-1), rationale (one sentence).
councilSummary: one sentence on what was kept and why.`;

export function buildSegmentUserPrompt(fileName: string, text: string): string {
  return `File: ${fileName}

Document:
${text}`;
}

export function buildPlanUserPrompt(
  fileName: string,
  segments: unknown
): string {
  return `File: ${fileName}

Segments (from Research Analyst):
${JSON.stringify(segments, null, 2)}

Propose table schemas only for high-value, source-supported segments. Do not pad table count.`;
}

export function buildExtractUserPrompt(
  fileName: string,
  text: string,
  plan: unknown
): string {
  return `File: ${fileName}

Source document:
${text}

Table plan (from Schema Architect):
${JSON.stringify(plan, null, 2)}

Extract rows with citations. Use null when not stated in source.`;
}

export function buildValidateUserPrompt(
  fileName: string,
  text: string,
  extracted: unknown
): string {
  return `File: ${fileName}

Source document:
${text}

Extracted tables (from Data Extractor):
${JSON.stringify(extracted, null, 2)}

Audit accuracy, types, and grounding. Set keep=false for low-value tables.`;
}

export function buildCurateUserPrompt(
  fileName: string,
  text: string,
  audited: unknown
): string {
  return `File: ${fileName}

Source document:
${text}

Audited tables (from Accuracy Auditor):
${JSON.stringify(audited, null, 2)}

Cast final council votes: keep only research-relevant tables. Drop attendee rosters and admin metadata.`;
}
