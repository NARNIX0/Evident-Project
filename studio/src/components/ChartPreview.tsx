"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  ZAxis,
  LabelList,
  Label,
} from "recharts";
import { FileImage, FileSpreadsheet, ArrowLeft, Loader2, Presentation, ArrowRight } from "lucide-react";
import { exportChartAsPng, elementToPngDataUrl } from "@/lib/exportChart";
import { exportDatasetAsCsv } from "@/lib/exportCsv";
import { exportChartSlide } from "@/lib/exportSlide";
import {
  getExportPreset,
  sanitizeExportFilename,
  EXPORT_THEME_OPTIONS,
  EXPORT_PALETTE_OPTIONS,
  makeExportPresetId,
} from "@/lib/exportPresets";
import {
  formatDataLabel,
  formatCompositionTooltip,
  formatPiePercent,
  getColumnType,
  sortPieData,
  sumPieValues,
} from "@/lib/chartLabels";
import { resolveYAxisLabel } from "@/lib/chartDataShape";
import { prepareChartView } from "@/lib/chartRenderGuard";
import {
  chartHoverCursor,
  groupKeysByScale,
  paddedDomain,
} from "@/lib/chartAxisDomain";
import { formatAxisValue } from "@/lib/chartFormatting";
import { buildSourceNote } from "@/lib/sourceMetadata";
import { generateCaptionViaApi } from "@/lib/generateCaptionClient";
import AnalystCaption from "@/components/AnalystCaption";
import SourceTraceability from "@/components/SourceTraceability";
import type {
  ExtractedDataset,
  ChartRecommendation,
  ChartConfig,
  GeneratedCaption,
  ExportThemeId,
  ExportPaletteId,
  ChartTheme,
  SlideContentMode,
  DatasetColumn,
} from "@/types";
import { CHART_TYPE_LABELS } from "@/lib/chartCatalog";
import ChartErrorBoundary from "@/components/ChartErrorBoundary";

interface ChartPreviewProps {
  dataset: ExtractedDataset;
  recommendation: ChartRecommendation;
  onBack: () => void;
  onBackToHome: () => void;
  onNextTable?: () => void;
  nextTableLabel?: string;
}

export default function ChartPreview({
  dataset,
  recommendation,
  onBack,
  onBackToHome,
  onNextTable,
  nextTableLabel,
}: ChartPreviewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartPlotRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingSlide, setExportingSlide] = useState(false);
  const [exportTheme, setExportTheme] = useState<ExportThemeId>("light");
  const [exportPalette, setExportPalette] = useState<ExportPaletteId>("blue");
  const [slideContentMode, setSlideContentMode] =
    useState<SlideContentMode>("chart_and_caption");
  const [caption, setCaption] = useState<GeneratedCaption | null>(null);
  const [captionLoading, setCaptionLoading] = useState(true);
  const [captionError, setCaptionError] = useState<string | null>(null);

  const exportPreset = makeExportPresetId(exportTheme, exportPalette);
  const activePreset = getExportPreset(exportPreset);
  const chartTheme = activePreset.chart;

  useEffect(() => {
    let cancelled = false;

    async function loadCaption() {
      setCaptionLoading(true);
      setCaptionError(null);

      const result = await generateCaptionViaApi(dataset, recommendation);
      if (cancelled) return;

      if (result.status === "success") {
        setCaption(result.caption);
      } else {
        setCaptionError(result.error ?? "Failed to generate caption.");
      }
      setCaptionLoading(false);
    }

    loadCaption();
    return () => {
      cancelled = true;
    };
  }, [dataset, recommendation]);

  const prepared = prepareChartView(dataset, recommendation);

  const config: ChartConfig = {
    chartType: prepared.effectiveChartType,
    title: recommendation.title,
    xKey: prepared.xKey,
    yKey: prepared.yKey,
    seriesKey: recommendation.seriesKey,
    valueKeys: prepared.valueKeys ?? recommendation.valueKeys,
    yAxisLabel: prepared.yAxisLabel ?? recommendation.yAxisLabel,
    chartLayout: prepared.chartLayout,
    categoryKey: recommendation.categoryKey,
    sourceNote: buildSourceNote(dataset),
  };

  const chartData = prepared.data;
  const lineSeries = prepared.lineSeries;

  const handleExportPng = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const filename = sanitizeExportFilename(config.title, "png");
      await exportChartAsPng(
        chartRef.current,
        filename,
        chartTheme.background
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportSlide = async () => {
    const plotEl = chartPlotRef.current ?? chartRef.current;
    if (!plotEl) return;
    if (slideContentMode === "chart_and_caption" && !caption) return;
    setExportingSlide(true);
    try {
      const chartDataUrl = await elementToPngDataUrl(
        plotEl,
        chartTheme.background
      );
      await exportChartSlide({
        title: config.title,
        chartDataUrl,
        caption: caption ?? undefined,
        presetId: exportPreset,
        filename: sanitizeExportFilename(config.title, "pptx"),
        contentMode: slideContentMode,
        sourceNote: config.sourceNote,
      });
    } finally {
      setExportingSlide(false);
    }
  };

  const handleExportCsv = () => {
    exportDatasetAsCsv(dataset);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="pill-cta pill-cta-secondary">
            <ArrowLeft size={14} />
            Back to Recommendations
          </button>
          <button onClick={onBackToHome} className="pill-cta pill-cta-secondary">
            ← Start Over
          </button>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {onNextTable && (
            <button
              onClick={onNextTable}
              className="pill-cta pill-cta-primary"
            >
              <ArrowRight size={14} />
              Next table
              {nextTableLabel ? `: ${nextTableLabel}` : ""}
            </button>
          )}
          <button
            onClick={handleExportSlide}
            disabled={
              exportingSlide ||
              (slideContentMode === "chart_and_caption" &&
                (captionLoading || !caption))
            }
            className="pill-cta pill-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Presentation size={14} />
            {exportingSlide ? "Building slide…" : "Export Slide (PPTX)"}
          </button>
          <button
            onClick={handleExportPng}
            disabled={exporting}
            className="pill-cta pill-cta-secondary"
          >
            <FileImage size={14} />
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
          <button onClick={handleExportCsv} className="pill-cta pill-cta-secondary">
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="card-flat p-4 space-y-4">
        <div className="space-y-2">
          <p className="section-label">Export Theme</p>
          <div className="flex flex-wrap gap-2">
            {EXPORT_THEME_OPTIONS.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setExportTheme(theme.id)}
                className={`pill-cta ${
                  exportTheme === theme.id
                    ? "pill-cta-primary"
                    : "pill-cta-secondary"
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="section-label">Colour Palette</p>
          <div className="flex flex-wrap gap-2">
            {EXPORT_PALETTE_OPTIONS.map((palette) => (
              <button
                key={palette.id}
                onClick={() => setExportPalette(palette.id)}
                className={`pill-cta ${
                  exportPalette === palette.id
                    ? "pill-cta-primary"
                    : "pill-cta-secondary"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex gap-0.5">
                    {palette.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-2.5 w-2.5 rounded-sm border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  {palette.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-text-muted">{activePreset.description}</p>
      </div>

      <div className="card-flat p-4 space-y-3">
        <p className="section-label">Slide Layout (PPTX)</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSlideContentMode("chart_and_caption")}
            className={`pill-cta ${
              slideContentMode === "chart_and_caption"
                ? "pill-cta-primary"
                : "pill-cta-secondary"
            }`}
          >
            Chart + bullet points
          </button>
          <button
            onClick={() => setSlideContentMode("chart_only")}
            className={`pill-cta ${
              slideContentMode === "chart_only"
                ? "pill-cta-primary"
                : "pill-cta-secondary"
            }`}
          >
            Chart only (larger)
          </button>
        </div>
        <p className="text-xs text-text-muted">
          {slideContentMode === "chart_only"
            ? "Maximises chart size on the slide. Source note only at the bottom."
            : "Includes analyst headline and bullet points below the chart."}
        </p>
      </div>

      {/* Chart card */}
      <div
        ref={chartRef}
        className="chart-container rounded-xl border border-border-subtle p-5"
        style={{ backgroundColor: chartTheme.background }}
      >
        <div className="mb-4">
          <div
            className="h-1 w-12 rounded-full mb-3"
            style={{ backgroundColor: chartTheme.accentColor }}
          />
          <h2
            className="text-base font-bold"
            style={{ color: chartTheme.titleColor }}
          >
            {config.title}
          </h2>
        </div>

        <div ref={chartPlotRef} className="h-[440px]">
          {!prepared.renderable ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p
                className="text-sm font-medium"
                style={{ color: chartTheme.titleColor }}
              >
                Chart could not be rendered
              </p>
              <p
                className="text-xs max-w-md"
                style={{ color: chartTheme.axisColor }}
              >
                {prepared.issues[0] ??
                  "No plottable points for the selected columns. Go back and pick another recommendation."}
              </p>
            </div>
          ) : (
            <ChartErrorBoundary>
              <ChartRenderer
                chartType={config.chartType}
                data={chartData}
                xKey={config.xKey}
                yKey={config.yKey}
                seriesKey={config.seriesKey}
                valueKeys={config.valueKeys}
                yAxisLabel={config.yAxisLabel}
                lineSeries={lineSeries}
                columns={dataset.columns}
                theme={chartTheme}
              />
            </ChartErrorBoundary>
          )}
        </div>
        {prepared.repairNote && (
          <p
            className="mt-2 text-[0.65rem]"
            style={{ color: chartTheme.axisColor }}
          >
            {prepared.repairNote}
          </p>
        )}

        {/* Source note */}
        {config.sourceNote && (
          <div
            className="mt-4 pt-3 border-t"
            style={{ borderColor: chartTheme.gridColor }}
          >
            <p
              className="text-[0.65rem]"
              style={{ color: chartTheme.axisColor }}
            >
              {config.sourceNote}
            </p>
          </div>
        )}
      </div>

      <SourceTraceability dataset={dataset} />

      {captionLoading && (
        <div className="card-elevated p-5 flex items-center gap-3 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin text-accent-400" />
          Generating analyst caption…
        </div>
      )}

      {captionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
          {captionError}
        </div>
      )}

      {caption && <AnalystCaption caption={caption} />}

      {/* Data summary */}
      <div className="card-flat p-4">
        <p className="section-label mb-2">Data Summary</p>
        <div className="flex gap-4 text-xs text-text-muted">
          <span>{dataset.rows.length} data points</span>
          <span>{dataset.columns.length} columns</span>
          <span>Chart: {CHART_TYPE_LABELS[recommendation.chartType] ?? recommendation.chartType}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Chart renderer ─── */

interface ChartRendererProps {
  chartType: string;
  data: Record<string, string | number | null>[];
  xKey: string;
  yKey: string;
  seriesKey?: string;
  valueKeys?: string[];
  yAxisLabel?: string;
  lineSeries?: { key: string; label: string }[];
  columns: DatasetColumn[];
  theme: ChartTheme;
}

function ChartRenderer({
  chartType,
  data,
  xKey,
  yKey,
  seriesKey,
  valueKeys,
  yAxisLabel,
  lineSeries,
  columns,
  theme,
}: ChartRendererProps) {
  const xLabel = columns.find((c) => c.key === xKey)?.label ?? xKey;
  const yLabel = columns.find((c) => c.key === yKey)?.label ?? yKey;
  const sLabel = seriesKey
    ? columns.find((c) => c.key === seriesKey)?.label ?? seriesKey
    : undefined;

  // Metric keys for filtering — NEVER use category labels as numeric series.
  // horizontal_bar: xKey=metric, yKey=category (layout=vertical in Recharts)
  const seriesKeysForFilter =
    lineSeries && lineSeries.length > 0
      ? lineSeries.map((s) => s.key)
      : chartType === "horizontal_bar"
        ? [xKey]
        : valueKeys && valueKeys.length > 0
          ? valueKeys
          : seriesKey
            ? [yKey, seriesKey]
            : [yKey];

  // Category/x presence + at least one numeric series value
  const categoryKeyForFilter =
    chartType === "horizontal_bar" ? yKey : xKey;

  const cleanData = data.filter((d) => {
    const cat = d[categoryKeyForFilter];
    if (cat === null || cat === undefined || String(cat).trim() === "") {
      return false;
    }
    // For horizontal_bar, also require the metric (xKey) to be present
    if (chartType === "horizontal_bar") {
      const metric = d[xKey];
      return (
        metric !== null &&
        metric !== undefined &&
        !Number.isNaN(Number(metric))
      );
    }
    if (d[xKey] === null || d[xKey] === undefined) return false;
    return seriesKeysForFilter.some((key) => {
      const v = d[key];
      return v !== null && v !== undefined && !Number.isNaN(Number(v));
    });
  });

  const axisStyle = {
    fontSize: 11,
    fill: theme.axisColor,
  };

  const axisLabelStyle = {
    fill: theme.axisColor,
    fontSize: 11,
  };

  const tooltipProps = {
    contentStyle: {
      backgroundColor: theme.tooltipBackground,
      border: `1px solid ${theme.tooltipBorder}`,
      borderRadius: "0.5rem",
      fontSize: 12,
      color: theme.tooltipText,
    },
    itemStyle: {
      color: theme.tooltipText,
    },
    labelStyle: {
      color: theme.tooltipText,
      fontWeight: 600,
    },
  };

  const seriesTooltipFormatter = (value: number, name: string) => [
    formatAxisValue(Number(value)),
    name,
  ];

  const yColType = getColumnType(columns, yKey);
  const labelFill = theme.titleColor;
  const labelFontSize = 10;
  const showPointLabels = cleanData.length <= 10;

  const valueLabel = (value: unknown, key: string) =>
    formatDataLabel(Number(value), getColumnType(columns, key));

  const piePercentLabel = ({ percent }: { percent?: number }) =>
    formatPiePercent(percent ?? 0) ?? "";

  const makePieTooltipFormatter = (total: number) => (
    value: number,
    name: string,
    item: { percent?: number; payload?: { percent?: number } }
  ) => {
    const pct =
      item?.percent ??
      item?.payload?.percent ??
      (total > 0 ? Number(value) / total : 0);
    return [
      formatCompositionTooltip(Number(value), pct, yColType, total),
      name,
    ];
  };

  const renderBarLabels = (dataKey: string, position: "top" | "right") => (
    <LabelList
      dataKey={dataKey}
      position={position}
      formatter={(value: number) => valueLabel(value, dataKey)}
      fill={labelFill}
      fontSize={labelFontSize}
    />
  );

  const renderLineLabels = (dataKey: string, color: string) =>
    showPointLabels ? (
      <LabelList
        dataKey={dataKey}
        position="top"
        offset={8}
        formatter={(value: number) => valueLabel(value, dataKey)}
        fill={color}
        fontSize={labelFontSize}
      />
    ) : null;

  // Keep legend above the plot so it never overlaps angled x-axis labels.
  const legendStyle: CSSProperties = {
    fontSize: 11,
    color: theme.axisColor,
    paddingBottom: 4,
  };
  const legendProps = {
    verticalAlign: "top" as const,
    align: "center" as const,
    height: 28,
    wrapperStyle: legendStyle,
  };
  const cartesianMargin = { top: 44, right: 36, left: 28, bottom: 72 };
  const hoverCursor = chartHoverCursor(
    theme.background.toLowerCase() !== "#fcfcfc" &&
      theme.background.toLowerCase() !== "#ffffff"
  );
  const angledXAxisProps = {
    tick: axisStyle,
    axisLine: false as const,
    tickLine: false as const,
    angle: -35,
    textAnchor: "end" as const,
    height: 70,
    interval: 0 as const,
  };
  const primaryColor = theme.seriesColors[0];
  const secondaryColor = theme.seriesColors[1] ?? theme.seriesColors[0];
  const axisMetricLabel = resolveYAxisLabel(
    { yAxisLabel, yKey },
    columns,
    valueKeys
  );
  const groupedBarKeys =
    valueKeys && valueKeys.length > 1
      ? valueKeys
      : seriesKey
        ? [yKey, seriesKey]
        : [yKey];
  const scaleGroups = groupKeysByScale(groupedBarKeys, columns);

  switch (chartType) {
    case "horizontal_bar": {
      const barData = [...cleanData].sort(
        (a, b) => Number(b[xKey]) - Number(a[xKey])
      );
      const maxCatLen = Math.max(
        8,
        ...barData.map((d) => String(d[yKey] ?? "").length)
      );
      const yAxisWidth = Math.min(160, Math.max(90, maxCatLen * 7));
      const xDomain = paddedDomain(barData, [xKey]);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 8, right: 64, left: yAxisWidth + 8, bottom: 28 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.gridColor}
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={xDomain}
              tick={axisStyle}
              axisLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              label={{
                value: xLabel,
                position: "insideBottom",
                offset: -8,
                style: axisLabelStyle,
              }}
            />
            <YAxis
              type="category"
              dataKey={yKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
            />
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={(value: number) => [
                formatAxisValue(Number(value)),
                xLabel,
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Bar
              dataKey={xKey}
              fill={primaryColor}
              radius={[0, 4, 4, 0]}
              name={xLabel}
              activeBar={{ stroke: theme.accentColor, strokeWidth: 1 }}
            >
              {renderBarLabels(xKey, "right")}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "vertical_bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cleanData} margin={cartesianMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis dataKey={xKey} {...angledXAxisProps} />
            <YAxis
              domain={paddedDomain(cleanData, [yKey])}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                style: axisLabelStyle,
              }}
            />
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={(value: number) => [
                formatAxisValue(Number(value)),
                yLabel,
              ]}
              labelFormatter={(label) => `${xLabel}: ${label}`}
            />
            <Bar
              dataKey={yKey}
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
              name={yLabel}
              activeBar={{ stroke: theme.accentColor, strokeWidth: 1 }}
            >
              {renderBarLabels(yKey, "top")}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case "grouped_bar": {
      const useDualAxis = scaleGroups.isMixed;
      const leftKeys = useDualAxis
        ? scaleGroups.percentKeys
        : groupedBarKeys;
      const rightKeys = useDualAxis ? scaleGroups.absoluteKeys : [];
      const leftDomain = paddedDomain(cleanData, leftKeys);
      const rightDomain =
        rightKeys.length > 0
          ? paddedDomain(cleanData, rightKeys)
          : undefined;
      const leftLabel =
        leftKeys.length > 0
          ? resolveYAxisLabel({ yKey: leftKeys[0] }, columns, leftKeys)
          : axisMetricLabel;
      const rightLabel =
        rightKeys.length > 0
          ? resolveYAxisLabel({ yKey: rightKeys[0] }, columns, rightKeys)
          : "";

      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={cleanData}
            margin={{
              ...cartesianMargin,
              right: useDualAxis ? 56 : cartesianMargin.right,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis dataKey={xKey} {...angledXAxisProps} />
            <YAxis
              yAxisId="left"
              domain={leftDomain}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              label={{
                value: leftLabel,
                angle: -90,
                position: "insideLeft",
                style: axisLabelStyle,
              }}
            />
            {useDualAxis && rightDomain && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={rightDomain}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatAxisValue(Number(value))}
                label={{
                  value: rightLabel,
                  angle: 90,
                  position: "insideRight",
                  style: axisLabelStyle,
                }}
              />
            )}
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={seriesTooltipFormatter}
              labelFormatter={(label) => `${xLabel}: ${label}`}
            />
            <Legend {...legendProps} />
            {groupedBarKeys.map((key, index) => {
              const color =
                theme.seriesColors[index % theme.seriesColors.length];
              const label =
                columns.find((col) => col.key === key)?.label ?? key;
              const yAxisId = useDualAxis
                ? scaleGroups.absoluteKeys.includes(key)
                  ? "right"
                  : "left"
                : "left";
              return (
                <Bar
                  key={key}
                  yAxisId={yAxisId}
                  dataKey={key}
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  name={label}
                  activeBar={{
                    stroke: theme.accentColor,
                    strokeWidth: 1,
                    fill: color,
                  }}
                >
                  {showPointLabels && renderBarLabels(key, "top")}
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "stacked_bar": {
      const stackKeys = seriesKey ? [yKey, seriesKey] : [yKey];
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cleanData} margin={cartesianMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis dataKey={xKey} {...angledXAxisProps} />
            <YAxis
              domain={paddedDomain(cleanData, stackKeys)}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
            />
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={seriesTooltipFormatter}
            />
            <Legend {...legendProps} />
            <Bar
              dataKey={yKey}
              stackId="stack"
              fill={primaryColor}
              name={yLabel}
              activeBar={{ stroke: theme.accentColor, strokeWidth: 1 }}
            />
            {seriesKey && (
              <Bar
                dataKey={seriesKey}
                stackId="stack"
                fill={secondaryColor}
                name={sLabel ?? seriesKey}
                activeBar={{ stroke: theme.accentColor, strokeWidth: 1 }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "line": {
      const linesToRender =
        lineSeries ??
        [
          { key: yKey, label: yLabel },
          ...(seriesKey
            ? [{ key: seriesKey, label: sLabel ?? seriesKey }]
            : []),
        ];
      const lineKeys = linesToRender.map((s) => s.key);

      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cleanData} margin={cartesianMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis dataKey={xKey} {...angledXAxisProps} />
            <YAxis
              domain={paddedDomain(cleanData, lineKeys)}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              label={{
                value: axisMetricLabel,
                angle: -90,
                position: "insideLeft",
                style: axisLabelStyle,
              }}
            />
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={seriesTooltipFormatter}
              labelFormatter={(label) => `${xLabel}: ${label}`}
            />
            <Legend {...legendProps} />
            {linesToRender.map((series, index) => {
              const color =
                theme.seriesColors[index % theme.seriesColors.length];
              return (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: color }}
                  activeDot={{ r: 6, stroke: theme.accentColor, strokeWidth: 2 }}
                  name={series.label}
                >
                  {renderLineLabels(series.key, color)}
                </Line>
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case "area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cleanData} margin={cartesianMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis dataKey={xKey} {...angledXAxisProps} />
            <YAxis
              domain={paddedDomain(cleanData, [yKey])}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                style: axisLabelStyle,
              }}
            />
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={(value: number) => [
                formatAxisValue(Number(value)),
                yLabel,
              ]}
              labelFormatter={(label) => `${xLabel}: ${label}`}
            />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={primaryColor}
              fill={primaryColor}
              fillOpacity={0.15}
              strokeWidth={2}
              name={yLabel}
            >
              {renderLineLabels(yKey, primaryColor)}
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      );

    case "stacked_area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cleanData} margin={cartesianMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis dataKey={xKey} {...angledXAxisProps} />
            <YAxis
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
            />
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={seriesTooltipFormatter}
            />
            <Legend {...legendProps} />
            <Area
              type="monotone"
              dataKey={yKey}
              stackId="stack"
              stroke={primaryColor}
              fill={primaryColor}
              fillOpacity={0.5}
              name={yLabel}
            />
            {seriesKey && (
              <Area
                type="monotone"
                dataKey={seriesKey}
                stackId="stack"
                stroke={secondaryColor}
                fill={secondaryColor}
                fillOpacity={0.5}
                name={sLabel ?? seriesKey}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );

    case "combo":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cleanData} margin={cartesianMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis dataKey={xKey} {...angledXAxisProps} />
            <YAxis
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
            />
            <Tooltip
              {...tooltipProps}
              cursor={hoverCursor}
              formatter={seriesTooltipFormatter}
            />
            <Legend {...legendProps} />
            <Bar dataKey={yKey} fill={primaryColor} name={yLabel} radius={[4, 4, 0, 0]}>
              {showPointLabels && renderBarLabels(yKey, "top")}
            </Bar>
            {seriesKey && (
              <Line
                type="monotone"
                dataKey={seriesKey}
                stroke={secondaryColor}
                strokeWidth={2.5}
                dot={{ r: 3, fill: secondaryColor }}
                name={sLabel ?? seriesKey}
              >
                {renderLineLabels(seriesKey, secondaryColor)}
              </Line>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      );

    case "donut": {
      const pieData = sortPieData(
        cleanData.map((d) => ({
          name: String(d[xKey]),
          value: Number(d[yKey]) || 0,
        }))
      );
      const pieTotal = sumPieValues(pieData);
      const pieTooltipFormatter = makePieTooltipFormatter(pieTotal);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 36, right: 8, bottom: 8, left: 8 }}>
            <Tooltip
              {...tooltipProps}
              formatter={pieTooltipFormatter as never}
            />
            <Legend {...legendProps} />
            <Pie
              data={pieData}
              cx="50%"
              cy="52%"
              innerRadius={80}
              outerRadius={140}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              label={piePercentLabel}
              labelLine={{ stroke: theme.axisColor, strokeWidth: 1 }}
            >
              {pieData.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={theme.seriesColors[i % theme.seriesColors.length]}
                />
              ))}
              <Label
                value={formatDataLabel(pieTotal, yColType)}
                position="center"
                fill={theme.titleColor}
                fontSize={16}
                fontWeight={700}
                dy={-6}
              />
              <Label
                value="Total"
                position="center"
                fill={theme.axisColor}
                fontSize={10}
                dy={12}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case "pie": {
      const pieData = sortPieData(
        cleanData.map((d) => ({
          name: String(d[xKey]),
          value: Number(d[yKey]) || 0,
        }))
      );
      const pieTotal = sumPieValues(pieData);
      const pieTooltipFormatter = makePieTooltipFormatter(pieTotal);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 36, right: 8, bottom: 8, left: 8 }}>
            <Tooltip
              {...tooltipProps}
              formatter={pieTooltipFormatter as never}
            />
            <Legend {...legendProps} />
            <Pie
              data={pieData}
              cx="50%"
              cy="52%"
              outerRadius={140}
              paddingAngle={1}
              dataKey="value"
              nameKey="name"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              label={piePercentLabel}
              labelLine={{ stroke: theme.axisColor, strokeWidth: 1 }}
            >
              {pieData.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={theme.seriesColors[i % theme.seriesColors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis
              type="number"
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              name={xLabel}
              label={{
                value: xLabel,
                position: "insideBottom",
                offset: -5,
                style: axisLabelStyle,
              }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              name={yLabel}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                style: axisLabelStyle,
              }}
            />
            <Tooltip
              {...tooltipProps}
              formatter={(value: number) => [
                valueLabel(value, yKey),
                yLabel,
              ]}
              labelFormatter={() => `${xLabel} vs ${yLabel}`}
            />
            <Scatter
              data={cleanData}
              fill={primaryColor}
              name={`${yLabel} vs ${xLabel}`}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "bubble":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 28 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
            <XAxis
              type="number"
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              name={xLabel}
              label={{
                value: xLabel,
                position: "insideBottom",
                offset: -5,
                style: axisLabelStyle,
              }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
              name={yLabel}
              label={{
                value: yLabel,
                angle: -90,
                position: "insideLeft",
                style: axisLabelStyle,
              }}
            />
            {seriesKey && (
              <ZAxis
                type="number"
                dataKey={seriesKey}
                range={[80, 500]}
                name={sLabel ?? seriesKey}
              />
            )}
            <Tooltip
              {...tooltipProps}
              cursor={{ stroke: theme.axisColor, strokeDasharray: "3 3" }}
              formatter={(value: number, name: string) => [
                valueLabel(value, name === yLabel ? yKey : seriesKey ?? yKey),
                name,
              ]}
            />
            <Scatter data={cleanData} fill={primaryColor} name={yLabel} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case "radar": {
      const numericKeys = getNumericColumnKeys(columns).slice(0, 6);
      const entityNames = cleanData.map((d) => String(d[xKey]));
      const radarData = numericKeys.map((key) => {
        const col = columns.find((c) => c.key === key);
        const point: Record<string, string | number> = {
          metric: col?.label ?? key,
        };
        cleanData.forEach((d) => {
          point[String(d[xKey])] = Number(d[key]) || 0;
        });
        return point;
      });

      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="78%">
            <PolarGrid stroke={theme.gridColor} />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: theme.axisColor, fontSize: 10 }}
            />
            <PolarRadiusAxis
              tick={{ fill: theme.axisColor, fontSize: 9 }}
              axisLine={false}
              tickFormatter={(value) => formatAxisValue(Number(value))}
            />
            <Tooltip {...tooltipProps} />
            <Legend {...legendProps} />
            {entityNames.map((name, i) => (
              <Radar
                key={name}
                name={name}
                dataKey={name}
                stroke={theme.seriesColors[i % theme.seriesColors.length]}
                fill={theme.seriesColors[i % theme.seriesColors.length]}
                fillOpacity={0.12}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    case "treemap": {
      const treemapTotal = cleanData.reduce(
        (sum, d) => sum + (Number(d[yKey]) || 0),
        0
      );
      const treemapData = cleanData.map((d, i) => {
        const value = Number(d[yKey]) || 0;
        const share = treemapTotal > 0 ? (value / treemapTotal) * 100 : 0;
        return {
          name: String(d[xKey]),
          size: value,
          share,
          fill: theme.seriesColors[i % theme.seriesColors.length],
        };
      });
      return (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={treemapData}
            dataKey="size"
            nameKey="name"
            aspectRatio={4 / 3}
            stroke={theme.background}
            content={<TreemapLabeledCell />}
          >
            <Tooltip
              {...tooltipProps}
              formatter={(value: number, name: string, item: { payload?: { share?: number } }) => [
                `${formatDataLabel(Number(value), yColType)} (${(item.payload?.share ?? 0).toFixed(1)}%)`,
                name,
              ]}
            />
          </Treemap>
        </ResponsiveContainer>
      );
    }

    default:
      return (
        <div className="flex items-center justify-center h-full text-text-muted">
          Unsupported chart type: {chartType}
        </div>
      );
  }
}

function getNumericColumnKeys(
  columns: { key: string; type: string }[]
): string[] {
  return columns
    .filter((c) =>
      ["number", "currency", "percentage"].includes(c.type)
    )
    .map((c) => c.key);
}

function TreemapLabeledCell({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name,
  share,
  fill,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  share?: number;
  fill?: string;
}) {
  if (width < 2 || height < 2) return null;
  const showLabel = width > 48 && height > 28;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill ?? "#FF7129"}
        stroke="#222A43"
        strokeWidth={2}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={11}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={10}
          >
            {(share ?? 0).toFixed(0)}%
          </text>
        </>
      )}
    </g>
  );
}
