import { describe, it, expect } from "vitest";
import {
  extractTableTitleFromName,
  getTableDisplayLabel,
} from "../tableDisplayLabel";
import type { ExtractedDataset } from "@/types";

function ds(partial: Partial<ExtractedDataset>): ExtractedDataset {
  return {
    id: "t1",
    name: "notes — 2025 AI Investment by Use Case",
    sourceType: "file",
    extractionMethod: "test",
    columns: [],
    rows: [],
    ...partial,
  };
}

describe("tableDisplayLabel", () => {
  it("extracts title after em dash in dataset name", () => {
    expect(
      extractTableTitleFromName(
        "Evident_Client_Meeting_Notes_Natural — AI Talent Headcount"
      )
    ).toBe("AI Talent Headcount");
  });

  it("always uses LLM table title from dataset name", () => {
    expect(
      getTableDisplayLabel(
        ds({ tableCategory: "Other", name: "file — 2025 AI Investment by Use Case" })
      )
    ).toBe("2025 AI Investment by Use Case");
  });

  it("ignores category in favor of table title", () => {
    expect(
      getTableDisplayLabel(
        ds({ tableCategory: "Headcount & Talent", name: "file — AI Talent by Region" })
      )
    ).toBe("AI Talent by Region");
  });

  it("falls back to full name when no em dash", () => {
    expect(getTableDisplayLabel(ds({ name: "Standalone Table" }))).toBe(
      "Standalone Table"
    );
  });
});
