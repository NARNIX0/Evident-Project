import type {
  ExtractedDataset,
  ChartRecommendation,
} from "@/types";
import {
  isChartCouncilAvailable,
  recommendChartsRulesAnnotated,
  recommendChartsWithCouncil,
} from "@/lib/agents/charting/pipeline";
import { callLlmJson } from "@/lib/llmClient";
import {
  CHART_LLM_GUIDANCE,
  MAX_CHART_RECOMMENDATIONS,
  VALID_CHART_TYPES,
} from "@/lib/chartCatalog";
import type { ChartType } from "@/types";
import { validateRecommendations } from "@/lib/chartSpec";

interface RawChartRec {
  chartType?: string;
  title?: string;
  reason?: string;
  xKey?: string;
  yKey?: string;
  seriesKey?: string;
  valueKeys?: string[];
  yAxisLabel?: string;
  chartLayout?: string;
  categoryKey?: string;
  confidence?: number;
  usedColumns?: string[];
  unusedColumns?: string[];
  unusedJustification?: string;
}

interface RawChartPayload {
  recommendations?: RawChartRec[];
}

function annotate(
  dataset: ExtractedDataset,
  rec: ChartRecommendation
): ChartRecommendation {
  const allKeys = dataset.columns.map((c) => c.key);
  const usedSet = new Set(
    (
      rec.usedColumns ??
      [
        rec.xKey,
        rec.yKey,
        rec.seriesKey,
        rec.categoryKey,
        ...(rec.valueKeys ?? []),
      ]
    ).filter((k): k is string => Boolean(k) && k !== "year")
  );
  const usedColumns = allKeys.filter((k) => usedSet.has(k));
  const unusedColumns = allKeys.filter((k) => !usedSet.has(k));
  return {
    ...rec,
    usedColumns,
    unusedColumns,
    unusedJustification: rec.unusedJustification,
    encodingCoverage:
      allKeys.length === 0 ? 1 : usedColumns.length / allKeys.length,
  };
}

/** Legacy single-shot normalizer (tests + fallback). */
export function normalizeLlmRecommendations(
  dataset: ExtractedDataset,
  payload: RawChartPayload
): ChartRecommendation[] {
  const columnKeys = new Set(dataset.columns.map((c) => c.key));
  const recs: ChartRecommendation[] = [];

  for (const raw of payload.recommendations ?? []) {
    if (
      !raw.chartType ||
      !VALID_CHART_TYPES.includes(raw.chartType as ChartType)
    ) {
      continue;
    }

    const isYearPivot =
      raw.chartLayout === "year_pivot_lines" ||
      (raw.chartType === "line" && (raw.valueKeys?.length ?? 0) >= 2);

    if (!isYearPivot) {
      if (
        !raw.xKey ||
        !raw.yKey ||
        !columnKeys.has(raw.xKey) ||
        !columnKeys.has(raw.yKey)
      ) {
        continue;
      }
    } else {
      const categoryKey = raw.categoryKey ?? raw.xKey;
      if (!categoryKey || !columnKeys.has(categoryKey)) {
        continue;
      }
    }

    if (raw.seriesKey && !columnKeys.has(raw.seriesKey)) continue;
    if (raw.categoryKey && !columnKeys.has(raw.categoryKey)) continue;

    const valueKeys = (raw.valueKeys ?? []).filter((key) =>
      columnKeys.has(key)
    );

    recs.push(
      annotate(dataset, {
        chartType: raw.chartType as ChartType,
        title: raw.title?.trim() || "Chart",
        reason: raw.reason?.trim() || "Recommended based on data shape.",
        xKey: raw.xKey,
        yKey: raw.yKey,
        seriesKey: raw.seriesKey,
        valueKeys: valueKeys.length > 0 ? valueKeys : undefined,
        yAxisLabel: raw.yAxisLabel?.trim(),
        chartLayout:
          raw.chartLayout === "year_pivot_lines"
            ? "year_pivot_lines"
            : undefined,
        categoryKey: raw.categoryKey,
        confidence:
          typeof raw.confidence === "number"
            ? Math.min(1, Math.max(0, raw.confidence))
            : 0.7,
        generationMethod: "minimax-m3",
        usedColumns: raw.usedColumns,
        unusedColumns: raw.unusedColumns,
        unusedJustification: raw.unusedJustification,
      })
    );
  }

  return validateRecommendations(dataset, recs)
    .map((rec) => annotate(dataset, rec))
    .slice(0, MAX_CHART_RECOMMENDATIONS);
}

/**
 * Primary path: 3-agent MiniMax chart council.
 * Fallback: single-shot LLM, then rules — both with coverage annotation.
 */
export async function recommendChartsWithLlm(
  dataset: ExtractedDataset
): Promise<ChartRecommendation[]> {
  if (isChartCouncilAvailable()) {
    try {
      const councilRecs = await recommendChartsWithCouncil(dataset);
      if (councilRecs.length > 0) {
        return councilRecs;
      }
    } catch (err) {
      if (process.env.APP_ENV === "development") {
        console.error("[chart-council] failed, falling back", err);
      }
    }
  }

  // Single-shot LLM (lighter fallback)
  const payload = await callLlmJson<RawChartPayload>(
    "You recommend charts for analyst tables. Prefer multi-metric encodings when 2+ numeric columns exist. Return strict JSON. List usedColumns and unusedColumns for each chart.",
    `Recommend up to ${MAX_CHART_RECOMMENDATIONS} charts.

${CHART_LLM_GUIDANCE}

CRITICAL: If the table has 2+ numeric measures, at least one recommendation MUST be grouped_bar/radar/stacked_bar with valueKeys covering ALL meaningful measures. Do not recommend only name+one-metric charts.

For each recommendation include usedColumns and unusedColumns (with unusedJustification when columns are dropped).

Dataset:
${JSON.stringify(
  {
    name: dataset.name,
    columns: dataset.columns,
    sampleRows: dataset.rows.slice(0, 8).map((r) => r.values),
  },
  null,
  2
)}`
  );

  if (payload?.recommendations?.length) {
    const normalized = normalizeLlmRecommendations(dataset, payload);
    if (normalized.length > 0) return normalized;
  }

  return recommendChartsRulesAnnotated(dataset);
}
