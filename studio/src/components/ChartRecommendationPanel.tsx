"use client";

import {
  BarChart3,
  TrendingUp,
  PieChart,
  ScatterChart as ScatterIcon,
  Layers,
  ArrowRight,
  Activity,
  LayoutGrid,
  Radar as RadarIcon,
  Circle,
} from "lucide-react";
import type { ChartRecommendation, ChartType } from "@/types";
import { CHART_TYPE_LABELS } from "@/lib/chartCatalog";
import { Loader2 } from "lucide-react";

const CHART_ICONS: Record<ChartType, React.ReactNode> = {
  horizontal_bar: <BarChart3 size={18} className="rotate-90" />,
  vertical_bar: <BarChart3 size={18} />,
  grouped_bar: <Layers size={18} />,
  stacked_bar: <Layers size={18} className="rotate-90" />,
  line: <TrendingUp size={18} />,
  area: <TrendingUp size={18} />,
  stacked_area: <Activity size={18} />,
  combo: <Activity size={18} />,
  pie: <PieChart size={18} />,
  donut: <PieChart size={18} />,
  scatter: <ScatterIcon size={18} />,
  bubble: <Circle size={18} />,
  radar: <RadarIcon size={18} />,
  treemap: <LayoutGrid size={18} />,
};

interface ChartRecommendationPanelProps {
  datasetName?: string;
  recommendations: ChartRecommendation[];
  columnLabels?: Record<string, string>;
  loading?: boolean;
  onSelect: (rec: ChartRecommendation) => void;
  onBack: () => void;
  onBackToHome: () => void;
}

function labelFor(key: string | undefined, columnLabels?: Record<string, string>) {
  if (!key) return key;
  return columnLabels?.[key] ?? key;
}

export default function ChartRecommendationPanel({
  datasetName,
  recommendations,
  columnLabels,
  loading = false,
  onSelect,
  onBack,
  onBackToHome,
}: ChartRecommendationPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={24} className="animate-spin text-accent-400" />
        <p className="text-sm text-text-muted">
          Generating chart recommendations…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">Chart Recommendations</p>
        <h2 className="text-lg font-bold text-text-primary">
          {datasetName
            ? `Charts for ${datasetName.replace(/^.* — /, "")}`
            : "Based on your data shape, here are the best chart options."}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((rec, i) => (
          <button
            key={`${rec.chartType}-${rec.xKey}-${rec.yKey}-${(rec.valueKeys ?? []).join(",")}-${i}`}
            onClick={() => onSelect(rec)}
            className="card-elevated p-5 text-left group hover:border-accent-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-navy-800 border border-border-subtle text-accent-400 flex items-center justify-center">
                  {CHART_ICONS[rec.chartType]}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-400 transition-colors">
                    {CHART_TYPE_LABELS[rec.chartType]}
                  </h3>
                  <p
                    className="text-xs text-text-muted"
                    title="Fit score from column coverage, Evident chart-type preference, and encoding quality — not a raw LLM guess."
                  >
                    Fit: {Math.round(rec.confidence * 100)}%
                    {rec.generationMethod === "minimax-m3" && " · AI"}
                    {rec.generationMethod === "rules-fallback" && " · Rules"}
                    {rec.repaired && " · Validated"}
                  </p>
                </div>
              </div>
              <ArrowRight
                size={16}
                className="text-text-muted/30 group-hover:text-accent-400 transition-colors mt-1"
              />
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-2">
              {rec.reason}
            </p>
            {rec.validationIssues && rec.validationIssues.length > 0 && (
              <p className="text-[0.65rem] text-accent-400/90 mb-2 leading-relaxed">
                {rec.validationIssues[0]}
              </p>
            )}
            {(rec.usedColumns?.length || rec.unusedColumns?.length) && (
              <div className="mb-2 space-y-1">
                {rec.usedColumns && rec.usedColumns.length > 0 && (
                  <p className="text-[0.65rem] text-text-muted">
                    Shows:{" "}
                    {rec.usedColumns
                      .map((k) => labelFor(k, columnLabels))
                      .join(", ")}
                    {rec.encodingCoverage != null &&
                      ` · ${Math.round(rec.encodingCoverage * 100)}% of columns`}
                  </p>
                )}
                {rec.unusedColumns && rec.unusedColumns.length > 0 && (
                  <p className="text-[0.65rem] text-amber-300/90">
                    Not shown:{" "}
                    {rec.unusedColumns
                      .map((k) => labelFor(k, columnLabels))
                      .join(", ")}
                    {rec.unusedJustification
                      ? ` — ${rec.unusedJustification}`
                      : ""}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {rec.xKey && (
                <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle">
                  X: {labelFor(rec.xKey, columnLabels)}
                </span>
              )}
              {rec.yKey && (
                <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle">
                  Y: {labelFor(rec.yKey, columnLabels)}
                </span>
              )}
              {rec.seriesKey && (
                <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle">
                  Series: {labelFor(rec.seriesKey, columnLabels)}
                </span>
              )}
              {rec.valueKeys && rec.valueKeys.length > 1 && (
                <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle">
                  Metrics: {rec.valueKeys.length}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="pill-cta pill-cta-secondary">
          ← Back to Data
        </button>
        <button onClick={onBackToHome} className="pill-cta pill-cta-secondary">
          ← Start Over
        </button>
      </div>
    </div>
  );
}
