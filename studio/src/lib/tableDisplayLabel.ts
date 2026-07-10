import type { ExtractedDataset } from "@/types";

/** Display label from LLM extraction table title (after " — " in dataset name). */
export function getTableDisplayLabel(dataset: ExtractedDataset): string {
  const dash = dataset.name.indexOf(" — ");
  if (dash >= 0) {
    const title = dataset.name.slice(dash + 3).trim();
    if (title) return title;
  }
  return dataset.name.trim() || "Table";
}

export function extractTableTitleFromName(name: string): string {
  const dash = name.indexOf(" — ");
  if (dash >= 0) return name.slice(dash + 3).trim();
  return name.trim();
}
