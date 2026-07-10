import { describe, it, expect } from "vitest";
import type { ExtractedDataset } from "@/types";
import {
  createInitialVersion,
  detectDatasetChanges,
  recordVersion,
  restoreVersion,
  formatVersionLabel,
} from "../datasetVersionHistory";

const baseDataset: ExtractedDataset = {
  id: "ds-1",
  name: "Test",
  sourceType: "demo",
  extractionMethod: "manual",
  columns: [
    { key: "bank", label: "Bank", type: "string" },
    { key: "score", label: "AI Score", type: "number" },
  ],
  rows: [
    { id: "r1", values: { bank: "JPM", score: 82 } },
    { id: "r2", values: { bank: "GS", score: 78 } },
  ],
};

describe("datasetVersionHistory", () => {
  it("creates initial version on import", () => {
    const state = createInitialVersion(baseDataset);
    expect(state.versions).toHaveLength(1);
    expect(state.versions[0].description).toBe("Imported dataset");
    expect(state.activeVersionId).toBe(state.versions[0].id);
  });

  it("detects cell edits", () => {
    const edited: ExtractedDataset = {
      ...baseDataset,
      rows: [
        { id: "r1", values: { bank: "JPM", score: 90 } },
        { id: "r2", values: { bank: "GS", score: 78 } },
      ],
    };

    const change = detectDatasetChanges(baseDataset, edited);
    expect(change.description).toContain("Edited AI Score");
    expect(change.changeCount).toBe(1);
  });

  it("detects added row", () => {
    const edited: ExtractedDataset = {
      ...baseDataset,
      rows: [
        ...baseDataset.rows,
        { id: "r3", values: { bank: "MS", score: 70 } },
      ],
    };

    const change = detectDatasetChanges(baseDataset, edited);
    expect(change.description).toBe("Added row");
  });

  it("records versions and restores", () => {
    let state = createInitialVersion(baseDataset);

    const edited: ExtractedDataset = {
      ...baseDataset,
      rows: [
        { id: "r1", values: { bank: "JPM", score: 90 } },
        { id: "r2", values: { bank: "GS", score: 78 } },
      ],
    };

    const change = detectDatasetChanges(baseDataset, edited);
    state = recordVersion(state, edited, change.description, change.changeCount);
    expect(state.versions).toHaveLength(2);

    const firstVersionId = state.versions[0].id;
    const restored = restoreVersion(state, firstVersionId);
    expect(restored).not.toBeNull();
    expect(restored!.dataset.rows[0].values.score).toBe(82);
    expect(restored!.state.versions).toHaveLength(3);
    expect(restored!.state.versions[2].description).toContain("Restored to");
  });

  it("skips recording when no changes", () => {
    const state = createInitialVersion(baseDataset);
    const next = recordVersion(state, baseDataset, "No changes", 0);
    expect(next.versions).toHaveLength(1);
  });

  it("formats version labels with time and description", () => {
    const state = createInitialVersion(baseDataset);
    const label = formatVersionLabel(state.versions[0]);
    expect(label).toContain("Imported dataset");
  });
});
