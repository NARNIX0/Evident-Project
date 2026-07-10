import type { ChartRecommendation, ExtractedDataset } from "@/types";
import { recommendCharts } from "@/lib/chartRecommender";
import { validateRecommendations } from "@/lib/chartSpec";

/**
 * Client wrapper for LLM chart recommendations with validated rules fallback.
 */
export async function recommendChartsViaApi(
  dataset: ExtractedDataset
): Promise<ChartRecommendation[]> {
  let response: Response;
  try {
    response = await fetch("/api/recommend-charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset }),
    });
  } catch {
    return validateRecommendations(
      dataset,
      recommendCharts(dataset).map((rec) => ({
        ...rec,
        generationMethod: "rules-fallback" as const,
      }))
    );
  }

  let data: { status?: string; recommendations?: ChartRecommendation[] };
  try {
    data = (await response.json()) as {
      status?: string;
      recommendations?: ChartRecommendation[];
    };
  } catch {
    return validateRecommendations(
      dataset,
      recommendCharts(dataset).map((rec) => ({
        ...rec,
        generationMethod: "rules-fallback" as const,
      }))
    );
  }

  if (data.status === "success" && data.recommendations?.length) {
    return data.recommendations;
  }

  return validateRecommendations(
    dataset,
    recommendCharts(dataset).map((rec) => ({
      ...rec,
      generationMethod: "rules-fallback" as const,
    }))
  );
}
