import type { BatchQueueItem, BatchQueueProgress, ExtractedDataset, VerifiedTable } from "@/types";
import { validateUploadFile } from "./uploadValidation";

let idCounter = 0;

export type FileValidator = (
  file: Pick<File, "name" | "type" | "size">
) => string | null;

export function createBatchQueueItem(
  file: Pick<File, "name" | "size">
): BatchQueueItem {
  idCounter += 1;
  return {
    id: `batch-${Date.now().toString(36)}-${idCounter}`,
    fileName: file.name,
    fileSize: file.size,
    status: "pending",
  };
}

export function createBatchQueue(
  files: File[],
  validate?: FileValidator
): { items: BatchQueueItem[]; fileMap: Map<string, File>; errors: string[] } {
  const check = validate ?? validateUploadFile;
  const items: BatchQueueItem[] = [];
  const fileMap = new Map<string, File>();
  const errors: string[] = [];

  for (const file of files) {
    const validationError = check(file);
    if (validationError) {
      errors.push(`${file.name}: ${validationError}`);
      continue;
    }
    const item = createBatchQueueItem(file);
    items.push(item);
    fileMap.set(item.id, file);
  }

  return { items, fileMap, errors };
}

export function getBatchProgress(items: BatchQueueItem[]): BatchQueueProgress {
  const total = items.length;
  const ready = items.filter((i) => i.status === "review_ready").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const processed = ready + failed;

  return {
    total,
    processed,
    ready,
    failed,
    label: `${processed} of ${total} files processed`,
  };
}

export function updateQueueItem(
  items: BatchQueueItem[],
  id: string,
  patch: Partial<BatchQueueItem>
): BatchQueueItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function getNextPendingItem(
  items: BatchQueueItem[]
): BatchQueueItem | undefined {
  return items.find((item) => item.status === "pending");
}

export function isBatchComplete(items: BatchQueueItem[]): boolean {
  return (
    items.length > 0 &&
    items.every((item) => item.status === "review_ready" || item.status === "failed")
  );
}

export function hasReviewReadyItems(items: BatchQueueItem[]): boolean {
  return items.some((item) => item.status === "review_ready");
}

/** Collect successfully parsed datasets from selected (or all) ready queue items. */
export function getReviewReadyDatasets(
  items: BatchQueueItem[],
  selectedIds?: Set<string>
): ExtractedDataset[] {
  const datasets: ExtractedDataset[] = [];
  for (const item of items) {
    if (item.status !== "review_ready") continue;
    if (selectedIds && !selectedIds.has(item.id)) continue;
    if (item.datasets?.length) {
      datasets.push(...item.datasets);
    } else if (item.dataset) {
      datasets.push(item.dataset);
    }
  }
  return datasets;
}

/** Verified-table metadata for selected (or all) ready queue items. */
export function getReviewReadyVerifiedTables(
  items: BatchQueueItem[],
  selectedIds?: Set<string>
): VerifiedTable[] {
  return items.flatMap((item) => {
    if (item.status !== "review_ready") return [];
    if (selectedIds && !selectedIds.has(item.id)) return [];
    return item.verifiedTables ?? [];
  });
}
