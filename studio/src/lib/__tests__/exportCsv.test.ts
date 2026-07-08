import { describe, it, expect } from "vitest";
import { datasetToCsvString } from "../exportCsv";
import type { ExtractedDataset } from "@/types";

describe("datasetToCsvString", () => {
  it("produces valid CSV with headers and data", () => {
    const ds: ExtractedDataset = {
      id: "test",
      name: "Test Dataset",
      sourceType: "demo",
      extractionMethod: "test",
      columns: [
        { key: "name", label: "Name", type: "string" },
        { key: "value", label: "Value", type: "number" },
      ],
      rows: [
        { id: "1", values: { name: "Alice", value: 100 } },
        { id: "2", values: { name: "Bob", value: 200 } },
      ],
    };

    const csv = datasetToCsvString(ds);
    const lines = csv.split(/\r?\n/);

    expect(lines[0]).toBe("Name,Value");
    expect(lines[1]).toBe("Alice,100");
    expect(lines[2]).toBe("Bob,200");
  });

  it("handles null values as empty strings", () => {
    const ds: ExtractedDataset = {
      id: "test",
      name: "Test",
      sourceType: "demo",
      extractionMethod: "test",
      columns: [{ key: "x", label: "X", type: "string" }],
      rows: [{ id: "1", values: { x: null } }],
    };

    const csv = datasetToCsvString(ds);
    expect(csv).toMatch(/X\r?\n/);
  });

  it("escapes values with commas", () => {
    const ds: ExtractedDataset = {
      id: "test",
      name: "Test",
      sourceType: "demo",
      extractionMethod: "test",
      columns: [{ key: "desc", label: "Description", type: "string" }],
      rows: [{ id: "1", values: { desc: "Hello, world" } }],
    };

    const csv = datasetToCsvString(ds);
    expect(csv).toContain('"Hello, world"');
  });
});
