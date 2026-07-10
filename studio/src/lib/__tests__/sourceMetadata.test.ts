import { describe, it, expect } from "vitest";
import { buildSourceMetadata, buildSourceNote } from "../sourceMetadata";
import type { ExtractedDataset } from "@/types";

const baseDataset: ExtractedDataset = {
  id: "test",
  name: "Hotel bookings",
  sourceType: "file",
  sourceName: "Top 10 cities.png",
  sourcePage: 2,
  extractionMethod: "azure-document-intelligence",
  columns: [],
  rows: [],
};

describe("buildSourceMetadata", () => {
  it("includes filename, page, and extraction method", () => {
    const meta = buildSourceMetadata(baseDataset);

    expect(meta.fileName).toBe("Top 10 cities.png");
    expect(meta.pageNumber).toBe(2);
    expect(meta.extractionMethod).toBe("azure-document-intelligence");
    expect(meta.displayLabel).toContain("page 2");
  });

  it("handles missing page number", () => {
    const meta = buildSourceMetadata({ ...baseDataset, sourcePage: undefined });

    expect(meta.pageNumber).toBeUndefined();
    expect(meta.displayLabel).not.toContain("page");
  });
});

describe("buildSourceNote", () => {
  it("formats file source with page", () => {
    expect(buildSourceNote(baseDataset)).toBe(
      "Source file: Top 10 cities.png, page 2 (azure-document-intelligence)"
    );
  });

  it("formats demo datasets", () => {
    const note = buildSourceNote({
      ...baseDataset,
      sourceType: "demo",
      sourcePage: undefined,
      sourceName: "Synthetic demo",
    });

    expect(note).toContain("Demo dataset");
  });
});
