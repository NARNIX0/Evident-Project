import { describe, it, expect } from "vitest";
import {
  parseLayoutTable,
  parseCsvLines,
  inferColumnType,
  MAX_TABLES_PER_DOCUMENT,
  MAX_LLM_CALLS_PER_EXTRACT,
} from "../tableExtraction";
import { buildDatasetFromTable } from "../documentExtractor";

describe("tableExtraction", () => {
  it("parses Azure-style layout table", () => {
    const parsed = parseLayoutTable({
      rowCount: 3,
      columnCount: 2,
      cells: [
        { rowIndex: 0, columnIndex: 0, content: "Bank" },
        { rowIndex: 0, columnIndex: 1, content: "Score" },
        { rowIndex: 1, columnIndex: 0, content: "JPM" },
        { rowIndex: 1, columnIndex: 1, content: "82" },
        { rowIndex: 2, columnIndex: 0, content: "GS" },
        { rowIndex: 2, columnIndex: 1, content: "78" },
      ],
      boundingRegions: [{ pageNumber: 2 }],
    });

    expect(parsed?.headers).toEqual(["Bank", "Score"]);
    expect(parsed?.rowValues).toHaveLength(2);
    expect(parsed?.sourcePage).toBe(2);
  });

  it("infers numeric column types", () => {
    expect(inferColumnType(["82", "78", "90"])).toBe("number");
    expect(inferColumnType(["JPM", "GS"])).toBe("string");
  });

  it("parses CSV lines into table", () => {
    const parsed = parseCsvLines([
      "City,Bookings",
      "Paris,1200000",
      "London,980000",
    ]);
    expect(parsed?.headers).toEqual(["City", "Bookings"]);
    expect(parsed?.rowValues).toHaveLength(2);
  });

  it("caps LLM council calls at 5 per file", () => {
    expect(MAX_LLM_CALLS_PER_EXTRACT).toBe(5);
  });

  it("allows more than 5 tables when source requires it", () => {
    expect(MAX_TABLES_PER_DOCUMENT).toBeGreaterThan(5);
  });
});

describe("buildDatasetFromTable", () => {
  it("names multi-table datasets with suffix", () => {
    const file = { name: "report.pdf" } as File;
    const result = buildDatasetFromTable(
      file,
      {
        headers: ["A", "B"],
        rowValues: [["1", "2"]],
      },
      "azure-document-intelligence",
      0.9,
      2
    );

    expect(result.status).toBe("success");
    expect(result.dataset?.name).toContain("Table 3");
    expect(result.dataset?.tableIndex).toBe(2);
  });
});
