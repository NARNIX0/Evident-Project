import { describe, it, expect } from "vitest";
import { parseCsv, parsePastedTable } from "../parseTable";

describe("parseCsv", () => {
  it("parses a simple CSV with headers and data rows", () => {
    const csv = "Name,Score,Amount\nAlice,85,$1,200\nBob,72,$900";
    const ds = parseCsv(csv, "test.csv");

    expect(ds.name).toBe("test.csv");
    expect(ds.sourceType).toBe("csv");
    expect(ds.columns).toHaveLength(3);
    expect(ds.rows).toHaveLength(2);
    expect(ds.columns[0].label).toBe("Name");
    expect(ds.columns[0].type).toBe("string");
    expect(ds.columns[1].type).toBe("number");
    expect(ds.rows[0].values.name).toBe("Alice");
  });

  it("infers percentage columns", () => {
    const csv = "Category,Pct\nA,28%\nB,22%\nC,18%";
    const ds = parseCsv(csv);

    expect(ds.columns[1].type).toBe("percentage");
    expect(ds.rows[0].values.pct).toBe(28);
  });

  it("parses positive signed percentages like +22.5%", () => {
    const csv = "Region,Change\nNA,+22.5%\nEU,+18.2%";
    const ds = parseCsv(csv);

    expect(ds.columns[1].type).toBe("percentage");
    expect(ds.rows[0].values.change).toBe(22.5);
    expect(ds.rows[1].values.change).toBe(18.2);
  });

  it("handles null/empty values", () => {
    const csv = "Name,Value\nA,10\nB,\nC,N/A";
    const ds = parseCsv(csv);

    expect(ds.rows[1].values.value).toBeNull();
    expect(ds.rows[2].values.value).toBeNull();
  });

  it("throws on CSV with no data rows", () => {
    expect(() => parseCsv("Name,Value")).toThrow(
      "CSV must have a header row and at least one data row."
    );
  });

  it("strips commas from numbers", () => {
    const csv = "Bank,Investment\nJPMorgan,430\nGoldman,1200";
    const ds = parseCsv(csv);

    expect(ds.columns[1].type).toBe("number");
    expect(ds.rows[1].values.investment).toBe(1200);
  });
});

describe("parsePastedTable", () => {
  it("parses tab-separated pasted table", () => {
    const text = "Bank\tScore\tInvestment\nJPMorgan\t82\t430\nGoldman\t78\t380";
    const ds = parsePastedTable(text, "Pasted");

    expect(ds.sourceType).toBe("pasted");
    expect(ds.columns).toHaveLength(3);
    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0].values.bank).toBe("JPMorgan");
  });

  it("parses pipe-separated table", () => {
    const text = "Category | Share\nA | 28\nB | 22";
    const ds = parsePastedTable(text);

    expect(ds.columns).toHaveLength(2);
    expect(ds.rows).toHaveLength(2);
  });

  it("parses multi-space separated pasted table", () => {
    const text = "Bank  Score  Investment\nJPMorgan  82  430\nGoldman  78  380";
    const ds = parsePastedTable(text);

    expect(ds.columns).toHaveLength(3);
    expect(ds.rows[0].values.bank).toBe("JPMorgan");
    expect(ds.rows[1].values.investment).toBe(380);
  });

  it("skips markdown separator lines", () => {
    const text =
      "Name | Value\n--- | ---\nAlice | 100\nBob | 200";
    const ds = parsePastedTable(text);

    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0].values.name).toBe("Alice");
  });

  it("throws on single-line input", () => {
    expect(() => parsePastedTable("Name\tValue")).toThrow(
      "Pasted table must have a header row and at least one data row."
    );
  });
});
