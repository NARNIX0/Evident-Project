import type { ChartRecommendation, ChartType, ExtractedDataset } from "@/types";

/** Stable identity for deduplicating near-identical recommendations. */
export function recommendationDedupeKey(rec: ChartRecommendation): string {
  const values = [...(rec.valueKeys ?? [])].sort().join(",");
  return [
    rec.chartType,
    rec.xKey ?? "",
    rec.yKey ?? "",
    rec.seriesKey ?? "",
    rec.categoryKey ?? "",
    rec.chartLayout ?? "",
    values,
  ].join("|");
}

/** Evident-preferred chart families (higher = more preferred). */
const EVIDENT_TYPE_SCORE: Partial<Record<ChartType, number>> = {
  horizontal_bar: 1,
  stacked_bar: 0.95,
  grouped_bar: 0.95,
  donut: 0.9,
  pie: 0.85,
  scatter: 0.85,
  bubble: 0.8,
  vertical_bar: 0.75,
  line: 0.7,
  area: 0.55,
  treemap: 0.5,
  radar: 0.35,
  combo: 0.4,
  stacked_area: 0.4,
};

/**
 * Deterministic confidence from encoding quality — not an arbitrary LLM number.
 * Factors: column coverage, Evident chart-type fit, multi-metric honesty, title quality.
 */
export function scoreRecommendationConfidence(
  dataset: ExtractedDataset,
  rec: ChartRecommendation
): number {
  const allKeys = dataset.columns.map((c) => c.key);
  const used = new Set(
    [
      ...(rec.usedColumns ?? []),
      rec.xKey,
      rec.yKey,
      rec.seriesKey,
      rec.categoryKey,
      ...(rec.valueKeys ?? []),
    ].filter((k): k is string => Boolean(k) && k !== "year")
  );
  const coverage =
    allKeys.length === 0
      ? 0.5
      : allKeys.filter((k) => used.has(k)).length / allKeys.length;

  const typeScore = EVIDENT_TYPE_SCORE[rec.chartType] ?? 0.4;

  const numericCount = dataset.columns.filter((c) =>
    ["number", "currency", "percentage"].includes(c.type)
  ).length;
  const encodedMetrics = (rec.valueKeys?.length ?? 0) || (rec.yKey ? 1 : 0);
  const multiMetricBonus =
    numericCount >= 2 && (rec.valueKeys?.length ?? 0) >= 2 ? 0.08 : 0;
  const underEncodePenalty =
    numericCount >= 3 && encodedMetrics === 1 && rec.chartType !== "donut" && rec.chartType !== "pie"
      ? -0.12
      : 0;

  const title = rec.title?.trim() ?? "";
  const titleBonus =
    title.length >= 12 && !/^chart$/i.test(title) ? 0.05 : -0.05;

  const raw =
    0.35 * coverage +
    0.4 * typeScore +
    0.15 +
    multiMetricBonus +
    underEncodePenalty +
    titleBonus;

  return Math.min(0.97, Math.max(0.35, Number(raw.toFixed(2))));
}

/**
 * Drop duplicate encodings; keep highest-confidence of each identity.
 * Re-score confidence deterministically so UI is not stuck on LLM defaults (0.7).
 */
export function dedupeAndScoreRecommendations(
  dataset: ExtractedDataset,
  recommendations: ChartRecommendation[]
): ChartRecommendation[] {
  const best = new Map<string, ChartRecommendation>();

  for (const rec of recommendations) {
    const scored: ChartRecommendation = {
      ...rec,
      confidence: scoreRecommendationConfidence(dataset, rec),
      encodingCoverage:
        rec.encodingCoverage ??
        (() => {
          const allKeys = dataset.columns.map((c) => c.key);
          const used = new Set(
            [
              rec.xKey,
              rec.yKey,
              rec.seriesKey,
              rec.categoryKey,
              ...(rec.valueKeys ?? []),
            ].filter((k): k is string => Boolean(k) && k !== "year")
          );
          return allKeys.length === 0
            ? 1
            : allKeys.filter((k) => used.has(k)).length / allKeys.length;
        })(),
    };
    const key = recommendationDedupeKey(scored);
    const existing = best.get(key);
    if (!existing || scored.confidence > existing.confidence) {
      best.set(key, scored);
    }
  }

  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}
