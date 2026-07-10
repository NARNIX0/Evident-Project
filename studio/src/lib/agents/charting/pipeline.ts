import type { ChartRecommendation, ExtractedDataset } from "@/types";
import { callLlmJson, isLlmConfigured } from "@/lib/llmClient";
import { MAX_CHART_RECOMMENDATIONS } from "@/lib/chartCatalog";
import { profileTable } from "@/lib/tableProfiler";
import { validateRecommendations } from "@/lib/chartSpec";
import { recommendCharts } from "@/lib/chartRecommender";
import {
  CHART_CRITIC_PROMPT,
  CHART_PLANNER_PROMPT,
  CHART_STRATEGIST_PROMPT,
} from "./prompts";
import {
  ChartCritiqueSchema,
  ChartPlanSchema,
  EncodingStrategySchema,
  MAX_CHART_COUNCIL_CALLS,
  type ChartCritique,
  type ChartPlan,
  type ChartPlanItem,
  type EncodingStrategy,
} from "./schemas";

export function isChartCouncilAvailable(): boolean {
  if (!isLlmConfigured()) return false;
  if (process.env.USE_CHART_COUNCIL === "false") return false;
  return true;
}

function datasetPayload(dataset: ExtractedDataset) {
  const profile = profileTable(dataset);
  return {
    name: dataset.name,
    rowCount: dataset.rows.length,
    columns: dataset.columns.map((c) => ({
      key: c.key,
      label: c.label,
      type: c.type,
    })),
    sampleRows: dataset.rows.slice(0, 10).map((r) => r.values),
    // Soft hints only — council should reason, not copy these blindly
    softHints: {
      dimensions: profile.dimensions.map((d) => ({ key: d.key, label: d.label })),
      measures: profile.measures.map((m) => ({
        key: m.key,
        label: m.label,
        type: m.type,
        isShareLike: m.isShareLike,
        isYearMetric: m.isYearMetric,
      })),
      yearMetrics: profile.yearMetrics.map((m) => m.key),
    },
  };
}

function usedKeysFromPlan(item: ChartPlanItem): string[] {
  const keys = new Set<string>();
  for (const k of item.usedColumns ?? []) {
    if (k && k !== "year") keys.add(k);
  }
  for (const k of [
    item.xKey,
    item.yKey,
    item.seriesKey,
    item.categoryKey,
    ...(item.valueKeys ?? []),
  ]) {
    if (k && k !== "year") keys.add(k);
  }
  return [...keys];
}

function annotateCoverage(
  dataset: ExtractedDataset,
  rec: ChartRecommendation,
  plan?: ChartPlanItem
): ChartRecommendation {
  const allKeys = dataset.columns.map((c) => c.key);
  const used = new Set(
    plan
      ? usedKeysFromPlan(plan)
      : [
          rec.xKey,
          rec.yKey,
          rec.seriesKey,
          rec.categoryKey,
          ...(rec.valueKeys ?? []),
        ].filter((k): k is string => Boolean(k) && k !== "year")
  );

  const usedColumns = allKeys.filter((k) => used.has(k));
  const unusedColumns = allKeys.filter((k) => !used.has(k));

  return {
    ...rec,
    usedColumns,
    unusedColumns,
    unusedJustification: plan?.unusedJustification,
    encodingCoverage:
      allKeys.length === 0
        ? 1
        : usedColumns.length / Math.max(1, allKeys.length),
  };
}

function planToRecommendation(
  dataset: ExtractedDataset,
  item: ChartPlanItem
): ChartRecommendation {
  return annotateCoverage(
    dataset,
    {
      chartType: item.chartType as ChartRecommendation["chartType"],
      title: item.title,
      reason: item.reason,
      xKey: item.xKey,
      yKey: item.yKey,
      seriesKey: item.seriesKey,
      valueKeys: item.valueKeys,
      yAxisLabel: item.yAxisLabel,
      chartLayout: item.chartLayout,
      categoryKey: item.categoryKey,
      confidence: item.confidence,
      generationMethod: "minimax-m3",
    },
    item
  );
}

function applyCritique(
  dataset: ExtractedDataset,
  plan: ChartPlan,
  critique: ChartCritique
): ChartRecommendation[] {
  const byIndex = new Map(critique.critiques.map((c) => [c.index, c]));
  const out: ChartRecommendation[] = [];

  plan.recommendations.forEach((item, index) => {
    const c = byIndex.get(index);
    if (c && !c.keep) return;

    const revised: ChartPlanItem = {
      ...item,
      chartType: (c?.revisedChartType as ChartPlanItem["chartType"]) ?? item.chartType,
      title: c?.revisedTitle ?? item.title,
      reason: c?.revisedReason
        ? `${c.revisedReason}${critique.coverageSummary ? ` — ${critique.coverageSummary}` : ""}`
        : item.reason,
      valueKeys: c?.revisedValueKeys ?? item.valueKeys,
      usedColumns: c?.revisedValueKeys
        ? [
            ...new Set([
              ...(item.categoryKey ? [item.categoryKey] : []),
              ...(item.xKey && item.xKey !== "year" ? [item.xKey] : []),
              ...c.revisedValueKeys,
            ]),
          ]
        : item.usedColumns,
      confidence: Math.min(
        1,
        Math.max(0.15, item.confidence + (c?.confidenceAdjust ?? 0))
      ),
    };

    if (c?.underEncoded && !c.revisedValueKeys) {
      revised.confidence = Math.max(0.15, revised.confidence - 0.15);
      revised.reason = `${revised.reason} (critic flagged under-encoding)`;
    }

    out.push(planToRecommendation(dataset, revised));
  });

  return out;
}

function ensureMultiMetricCoverage(
  dataset: ExtractedDataset,
  strategy: EncodingStrategy,
  recs: ChartRecommendation[]
): ChartRecommendation[] {
  if (!strategy.requireMultiMetricChart || strategy.mustEncodeMeasures.length < 2) {
    return recs;
  }

  const must = strategy.mustEncodeMeasures;
  const hasFull = recs.some((rec) => {
    const used = new Set([
      ...(rec.valueKeys ?? []),
      rec.yKey,
      rec.seriesKey,
    ].filter(Boolean) as string[]);
    return must.every((k) => used.has(k));
  });

  if (hasFull) return recs;

  const dim =
    strategy.primaryDimension ??
    dataset.columns.find((c) => c.type === "string")?.key;
  if (!dim) return recs;

  const injected = annotateCoverage(dataset, {
    chartType: "grouped_bar",
    title: `All key metrics by ${
      dataset.columns.find((c) => c.key === dim)?.label ?? dim
    }`,
    reason:
      "Council injected multi-metric grouped bar so all must-encode measures appear together.",
    xKey: dim,
    yKey: must[0],
    seriesKey: must[1],
    valueKeys: must,
    confidence: 0.88,
    generationMethod: "minimax-m3",
  });

  return [injected, ...recs].slice(0, MAX_CHART_RECOMMENDATIONS);
}

async function runStrategist(
  dataset: ExtractedDataset
): Promise<EncodingStrategy | null> {
  const raw = await callLlmJson<unknown>(
    CHART_STRATEGIST_PROMPT,
    `Decide encodings for this table. Return JSON only.\n\n${JSON.stringify(datasetPayload(dataset), null, 2)}`
  );
  if (!raw) return null;
  const parsed = EncodingStrategySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function runPlanner(
  dataset: ExtractedDataset,
  strategy: EncodingStrategy
): Promise<ChartPlan | null> {
  const raw = await callLlmJson<unknown>(
    CHART_PLANNER_PROMPT,
    `Encoding strategy (follow this):\n${JSON.stringify(strategy, null, 2)}\n\nDataset:\n${JSON.stringify(datasetPayload(dataset), null, 2)}`
  );
  if (!raw) return null;
  const parsed = ChartPlanSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function runCritic(
  dataset: ExtractedDataset,
  strategy: EncodingStrategy,
  plan: ChartPlan
): Promise<ChartCritique | null> {
  const raw = await callLlmJson<unknown>(
    CHART_CRITIC_PROMPT,
    `Encoding strategy:\n${JSON.stringify(strategy, null, 2)}\n\nPlanned charts:\n${JSON.stringify(plan, null, 2)}\n\nColumns:\n${JSON.stringify(
      dataset.columns.map((c) => ({ key: c.key, label: c.label, type: c.type })),
      null,
      2
    )}`
  );
  if (!raw) return null;
  const parsed = ChartCritiqueSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * 3-call MiniMax chart council:
 * 1) Encoding strategist — which columns must appear
 * 2) Chart planner — chart types + encodings
 * 3) Coverage critic — reject/repair under-encoded charts
 */
export async function recommendChartsWithCouncil(
  dataset: ExtractedDataset
): Promise<ChartRecommendation[]> {
  void MAX_CHART_COUNCIL_CALLS;

  let strategy = await runStrategist(dataset);
  if (!strategy) {
    return [];
  }

  if (strategy.mustEncodeMeasures.length === 0) {
    const hints = datasetPayload(dataset)
      .softHints.measures.filter((m) => !m.isShareLike)
      .map((m) => m.key);
    if (hints.length === 0) return [];
    strategy = {
      ...strategy,
      mustEncodeMeasures: hints,
      requireMultiMetricChart: hints.length >= 2,
    };
  }

  const plan = await runPlanner(dataset, strategy);
  if (!plan?.recommendations.length) {
    return [];
  }

  const critique = await runCritic(dataset, strategy, plan);
  let recs = critique
    ? applyCritique(dataset, plan, critique)
    : plan.recommendations.map((item) => planToRecommendation(dataset, item));

  recs = ensureMultiMetricCoverage(dataset, strategy, recs);
  recs = validateRecommendations(dataset, recs).map((rec) =>
    annotateCoverage(dataset, rec)
  );

  return recs.slice(0, MAX_CHART_RECOMMENDATIONS);
}

/** Rules fallback only when council unavailable — still annotate coverage. */
export function recommendChartsRulesAnnotated(
  dataset: ExtractedDataset
): ChartRecommendation[] {
  return validateRecommendations(
    dataset,
    recommendCharts(dataset).map((rec) => ({
      ...rec,
      generationMethod: "rules-fallback" as const,
    }))
  ).map((rec) => annotateCoverage(dataset, rec));
}
