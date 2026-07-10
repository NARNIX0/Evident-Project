import { describe, it, expect } from "vitest";
import {
  createBatchQueue,
  createBatchQueueItem,
  getBatchProgress,
  updateQueueItem,
  getNextPendingItem,
  isBatchComplete,
  hasReviewReadyItems,
  getReviewReadyDatasets,
} from "../batchQueue";
import { validateCsvUploadFile } from "../uploadValidation";
import type { ExtractedDataset } from "@/types";

function mockFile(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

function miniDataset(id: string, name: string): ExtractedDataset {
  return {
    id,
    name,
    sourceType: "csv",
    extractionMethod: "csv-parser",
    columns: [{ key: "col0", label: "A", type: "string" }],
    rows: [{ id: "r0", values: { col0: "x" } }],
  };
}

describe("batchQueue", () => {
  it("creates queue items for valid files", () => {
    const { items, errors } = createBatchQueue([
      mockFile("a.pdf", "application/pdf", 1000),
      mockFile("b.png", "image/png", 2000),
    ]);

    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(2);
    expect(items[0].status).toBe("pending");
    expect(items[0].fileName).toBe("a.pdf");
  });

  it("skips invalid files and reports errors", () => {
    const { items, errors } = createBatchQueue([
      mockFile("good.pdf", "application/pdf", 1000),
      mockFile("bad.md", "text/markdown", 100),
    ]);

    expect(items).toHaveLength(1);
    expect(errors[0]).toContain("bad.md");
  });

  it("creates a CSV batch queue with the CSV validator", () => {
    const { items, errors } = createBatchQueue(
      [
        mockFile("a.csv", "text/csv", 100),
        mockFile("b.tsv", "text/tab-separated-values", 200),
        mockFile("skip.pdf", "application/pdf", 300),
      ],
      validateCsvUploadFile
    );

    expect(items).toHaveLength(2);
    expect(errors[0]).toContain("skip.pdf");
  });

  it("tracks progress across statuses", () => {
    const a = createBatchQueueItem({ name: "a.pdf", size: 1 });
    const b = createBatchQueueItem({ name: "b.pdf", size: 2 });
    const c = createBatchQueueItem({ name: "c.pdf", size: 3 });

    let queue = updateQueueItem([a, b, c], a.id, { status: "review_ready" });
    queue = updateQueueItem(queue, b.id, { status: "failed" });

    const progress = getBatchProgress(queue);
    expect(progress.label).toBe("2 of 3 files processed");
    expect(progress.ready).toBe(1);
    expect(progress.failed).toBe(1);
  });

  it("finds next pending item", () => {
    const a = createBatchQueueItem({ name: "a.pdf", size: 1 });
    const b = createBatchQueueItem({ name: "b.pdf", size: 2 });
    const queue = updateQueueItem([a, b], a.id, { status: "review_ready" });

    expect(getNextPendingItem(queue)?.id).toBe(b.id);
  });

  it("detects batch completion", () => {
    const a = createBatchQueueItem({ name: "a.pdf", size: 1 });
    const b = createBatchQueueItem({ name: "b.pdf", size: 2 });
    let queue = updateQueueItem([a, b], a.id, { status: "review_ready" });
    expect(isBatchComplete(queue)).toBe(false);

    queue = updateQueueItem(queue, b.id, { status: "failed" });
    expect(isBatchComplete(queue)).toBe(true);
    expect(hasReviewReadyItems(queue)).toBe(true);
  });

  it("collects review-ready datasets from the queue", () => {
    const a = createBatchQueueItem({ name: "a.csv", size: 1 });
    const b = createBatchQueueItem({ name: "b.csv", size: 2 });
    let queue = updateQueueItem([a, b], a.id, {
      status: "review_ready",
      dataset: miniDataset("d1", "a.csv"),
    });
    queue = updateQueueItem(queue, b.id, {
      status: "review_ready",
      dataset: miniDataset("d2", "b.csv"),
    });

    expect(getReviewReadyDatasets(queue).map((d) => d.id)).toEqual([
      "d1",
      "d2",
    ]);
    expect(
      getReviewReadyDatasets(queue, new Set([a.id])).map((d) => d.id)
    ).toEqual(["d1"]);
  });
});
