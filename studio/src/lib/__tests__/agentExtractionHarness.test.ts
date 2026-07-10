import { describe, it, expect } from "vitest";
import {
  applyDeterministicValidation,
  isQualitativeNumericPollution,
  computeDeterministicQuality,
} from "../agents/extraction/deterministicValidation";
import {
  assessTableRelevance,
  applyRelevanceBlocks,
} from "../agents/extraction/tableRelevance";
import {
  convertValidatedToDatasets,
  validatedTableToRaw,
} from "../agents/extraction/convertToDatasets";
import type { ValidateOutput } from "../agents/extraction/schemas";

function mockFile(name: string): File {
  return { name, type: "text/plain", size: 100 } as File;
}

describe("tableRelevance", () => {
  it("blocks attendee name/role rosters", () => {
    const verdict = assessTableRelevance({
      name: "Attendees & Participants",
      category: "Attendees & Participants",
      columns: [
        { key: "col0", label: "Name", type: "string" },
        { key: "col1", label: "Role", type: "string" },
      ],
      rows: [
        { values: { col0: "Georgia", col1: "Attendee" } },
        { values: { col0: "Michael", col1: "Attendee" } },
      ],
    });

    expect(verdict.block).toBe(true);
  });

  it("applyRelevanceBlocks sets keep=false for blocked tables", () => {
    const output = applyRelevanceBlocks({
      tables: [
        {
          segmentId: "p",
          name: "Meeting Attendees",
          category: "Other",
          qualityScore: 0.9,
          chartable: true,
          keep: true,
          issues: [],
          columns: [
            { key: "col0", label: "Name", type: "string" },
            { key: "col1", label: "Role", type: "string" },
          ],
          rows: [{ values: { col0: "Lena", col1: "Note-taker" } }],
        },
      ],
    });

    expect(output.tables[0].keep).toBe(false);
    expect(output.tables[0].issues[0]).toContain("participant");
  });
});

describe("deterministicValidation", () => {
  it("flags qualitative pollution in numeric columns", () => {
    expect(isQualitativeNumericPollution("steady")).toBe(true);
    expect(isQualitativeNumericPollution("7200")).toBe(false);
    expect(isQualitativeNumericPollution(27)).toBe(false);
  });

  it("downgrades sparse mixed-type talent tables", () => {
    const table: ValidateOutput["tables"][number] = {
      segmentId: "talent",
      name: "AI Talent by Region",
      category: "Headcount & Talent",
      qualityScore: 0.85,
      chartable: true,
      keep: true,
      issues: [],
      columns: [
        { key: "col0", label: "Region", type: "string" },
        { key: "col1", label: "Current FTEs", type: "number" },
        { key: "col2", label: "YoY Growth", type: "percentage" },
      ],
      rows: [
        {
          values: { col0: "North America", col1: 7200, col2: 22 },
        },
        {
          values: { col0: "Europe", col1: "steady", col2: null },
        },
        {
          values: { col0: "Asia-Pacific", col1: 3650, col2: 27 },
        },
        {
          values: { col0: "Latin America", col1: null, col2: null },
        },
      ],
    };

    const { adjustedScore, extraIssues } = computeDeterministicQuality(table);
    expect(adjustedScore).toBeLessThan(0.85);
    expect(extraIssues.some((i) => i.includes("mixes qualitative"))).toBe(true);
  });

  it("applyDeterministicValidation clears chartable on polluted tables", () => {
    const output: ValidateOutput = {
      tables: [
        {
          segmentId: "talent",
          name: "AI Talent by Region",
          category: "Headcount & Talent",
          qualityScore: 0.9,
          chartable: true,
          keep: true,
          issues: [],
          columns: [
            { key: "col0", label: "Region", type: "string" },
            { key: "col1", label: "Current FTEs", type: "number" },
          ],
          rows: [
            { values: { col0: "Europe", col1: "steady" } },
            { values: { col0: "APAC", col1: 3650 } },
          ],
        },
      ],
    };

    const validated = applyDeterministicValidation(output);
    expect(validated.tables[0].chartable).toBe(false);
    expect(validated.tables[0].issues.length).toBeGreaterThan(0);
  });
});

describe("convertToDatasets", () => {
  it("converts validated tables to ExtractedDataset with categories", () => {
    const validated: ValidateOutput = {
      documentSummary: "Client sync on AI adoption.",
      tables: [
        {
          segmentId: "adoption",
          name: "AI Adoption by Institution",
          category: "Financial Metrics",
          qualityScore: 0.88,
          chartable: true,
          keep: true,
          issues: [],
          columns: [
            { key: "col0", label: "Institution Type", type: "string" },
            { key: "col1", label: "AI Adoption %", type: "percentage" },
          ],
          rows: [
            { values: { col0: "Global banks", col1: 87 } },
            { values: { col0: "Fintechs", col1: 79 } },
          ],
        },
      ],
    };

    const file = mockFile("Evident_Meeting_Notes_Natural.txt");
    const datasets = convertValidatedToDatasets(
      validated,
      file,
      validated.documentSummary!
    );

    expect(datasets).toHaveLength(1);
    expect(datasets[0].tableCategory).toBe("Financial Metrics");
    expect(datasets[0].columns[1].type).toBe("percentage");
    expect(datasets[0].extractionMethod).toBe("agent-harness-oma");
  });

  it("skips tables marked keep=false", () => {
    const validated: ValidateOutput = {
      tables: [
        {
          segmentId: "people",
          name: "Attendees",
          category: "Attendees & Participants",
          qualityScore: 0.4,
          chartable: false,
          keep: false,
          issues: ["Not chartable"],
          columns: [{ key: "col0", label: "Name", type: "string" }],
          rows: [{ values: { col0: "Georgia" } }],
        },
      ],
    };

    const datasets = convertValidatedToDatasets(validated, mockFile("notes.txt"), "summary");
    expect(datasets).toHaveLength(0);
  });

  it("maps validated rows through rawTableToDataset", () => {
    const raw = validatedTableToRaw({
      segmentId: "inv",
      name: "AI Investment",
      category: "Investment & Budget",
      qualityScore: 0.8,
      chartable: true,
      keep: true,
      issues: [],
      columns: [
        { key: "col0", label: "Use Case", type: "string" },
        { key: "col1", label: "Investment ($M)", type: "number" },
      ],
      rows: [{ values: { col0: "Fraud detection", col1: 184 } }],
    });

    expect(raw.rows).toHaveLength(1);
    expect(raw.columns?.[1].type).toBe("number");
  });
});
