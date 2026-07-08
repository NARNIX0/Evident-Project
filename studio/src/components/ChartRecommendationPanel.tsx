"use client";

import {
  BarChart3,
  TrendingUp,
  PieChart,
  ScatterChart as ScatterIcon,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { ChartRecommendation, ChartType } from "@/types";

const CHART_ICONS: Record<ChartType, React.ReactNode> = {
  horizontal_bar: <BarChart3 size={18} className="rotate-90" />,
  vertical_bar: <BarChart3 size={18} />,
  grouped_bar: <Layers size={18} />,
  line: <TrendingUp size={18} />,
  area: <TrendingUp size={18} />,
  donut: <PieChart size={18} />,
  scatter: <ScatterIcon size={18} />,
};

const CHART_LABELS: Record<ChartType, string> = {
  horizontal_bar: "Horizontal Bar",
  vertical_bar: "Vertical Bar",
  grouped_bar: "Grouped Bar",
  line: "Line",
  area: "Area",
  donut: "Donut",
  scatter: "Scatter",
};

interface ChartRecommendationPanelProps {
  recommendations: ChartRecommendation[];
  onSelect: (rec: ChartRecommendation) => void;
  onBack: () => void;
}

export default function ChartRecommendationPanel({
  recommendations,
  onSelect,
  onBack,
}: ChartRecommendationPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">Chart Recommendations</p>
        <h2 className="text-lg font-bold text-text-primary">
          Based on your data shape, here are the best chart options.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((rec, i) => (
          <button
            key={`${rec.chartType}-${i}`}
            onClick={() => onSelect(rec)}
            className="card-elevated p-5 text-left group hover:border-accent-500/40 transition-all hover:translate-y-[-2px]"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent-500/10 text-accent-400 flex items-center justify-center">
                  {CHART_ICONS[rec.chartType]}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-400 transition-colors">
                    {CHART_LABELS[rec.chartType]}
                  </h3>
                  <p className="text-xs text-text-muted">
                    Confidence: {Math.round(rec.confidence * 100)}%
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
            <div className="flex gap-2 flex-wrap">
              {rec.xKey && (
                <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle">
                  X: {rec.xKey}
                </span>
              )}
              {rec.yKey && (
                <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle">
                  Y: {rec.yKey}
                </span>
              )}
              {rec.seriesKey && (
                <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle">
                  Series: {rec.seriesKey}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      <button onClick={onBack} className="pill-cta pill-cta-secondary">
        ← Back to Data
      </button>
    </div>
  );
}
