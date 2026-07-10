import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  extractMarkdownTableBlocks,
  extractActionItemsBlock,
  extractTablesFromDocumentText,
  hasSubstantiveMarkdownTables,
  isWeakTableDataset,
} from "../markdownDocumentParser";
import { parsePastedTable } from "../parseTable";

const MEETING_NOTES = readFileSync(
  join(process.cwd(), "src/lib/__tests__/fixtures/Evident_Client_Meeting_Notes.txt"),
  "utf-8"
);

describe("markdownDocumentParser", () => {
  it("finds five markdown tables in meeting notes", () => {
    const blocks = extractMarkdownTableBlocks(MEETING_NOTES);
    expect(blocks.length).toBe(5);
    expect(blocks[0].title).toContain("AI Investment");
    expect(blocks[1].title).toContain("Talent Headcount");
  });

  it("extracts action items as a sixth table", () => {
    const action = extractActionItemsBlock(MEETING_NOTES);
    expect(action).not.toBeNull();
    expect(action!.title).toBe("Action Items");
  });

  it("builds multiple datasets with proper columns", () => {
    const datasets = extractTablesFromDocumentText(
      MEETING_NOTES,
      "Evident_Client_Meeting_Notes"
    );
    expect(datasets.length).toBe(6);
    expect(datasets[0].columns.length).toBeGreaterThan(1);
    expect(datasets[0].rows.length).toBeGreaterThan(1);
    expect(datasets[0].name).toContain("AI Investment");
  });

  it("flags weak single-column whole-document parses", () => {
    const weak = parsePastedTable(MEETING_NOTES, "notes");
    expect(isWeakTableDataset(weak, MEETING_NOTES)).toBe(true);
  });

  it("does not flag real markdown tables as weak", () => {
    const datasets = extractTablesFromDocumentText(MEETING_NOTES, "notes");
    expect(isWeakTableDataset(datasets[0], datasets[0].rows[0].values.col0 as string)).toBe(false);
  });

  it("treats action-items-only pseudo table as non-substantive", () => {
    const natural = readFileSync(
      join(process.cwd(), "..", "Evident_Client_Meeting_Notes_Natural.txt"),
      "utf-8"
    );
    const datasets = extractTablesFromDocumentText(
      natural,
      "Evident_Client_Meeting_Notes_Natural"
    );
    expect(datasets.length).toBe(1);
    expect(datasets[0].name).toContain("Action Items");
    expect(hasSubstantiveMarkdownTables(datasets)).toBe(false);
  });
});
