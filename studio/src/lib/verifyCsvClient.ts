import type { ExtractedDataset, VerifiedTable } from "@/types";

export interface CsvVerifyApiResult {
  status: "success" | "error";
  datasets?: ExtractedDataset[];
  verifiedTables?: VerifiedTable[];
  method?: string;
  error?: string;
}

/**
 * Client wrapper for the light CSV review council.
 * On failure, returns the original datasets unchanged so parsing still works.
 */
export async function verifyCsvDatasetsViaApi(
  datasets: ExtractedDataset[]
): Promise<CsvVerifyApiResult> {
  if (datasets.length === 0) {
    return { status: "success", datasets: [], verifiedTables: [], method: "csv-parser-only" };
  }

  try {
    const response = await fetch("/api/verify-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasets }),
    });

    const data = (await response.json()) as CsvVerifyApiResult;
    if (!response.ok || data.status === "error") {
      return {
        status: "error",
        error: data.error ?? "CSV review failed.",
        datasets,
      };
    }

    return {
      status: "success",
      datasets: data.datasets?.length ? data.datasets : datasets,
      verifiedTables: data.verifiedTables,
      method: data.method,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "CSV review request failed.",
      datasets,
    };
  }
}
