import type { CaptionResult, ChartRecommendation, ExtractedDataset } from "@/types";

export async function generateCaptionViaApi(
  dataset: ExtractedDataset,
  recommendation: ChartRecommendation
): Promise<CaptionResult> {
  let response: Response;
  try {
    response = await fetch("/api/caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset, recommendation }),
    });
  } catch {
    return {
      status: "error",
      error: "Could not reach the caption service. Check your connection and try again.",
    };
  }

  try {
    return (await response.json()) as CaptionResult;
  } catch {
    return {
      status: "error",
      error: "Received an invalid response from the caption service.",
    };
  }
}
