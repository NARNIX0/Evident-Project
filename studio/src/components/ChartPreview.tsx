"use client";

import { useRef, useState } from "react";
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
} from "recharts";
import { Download, FileImage, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { exportChartAsPng } from "@/lib/exportChart";
import { exportDatasetAsCsv } from "@/lib/exportCsv";
import type {
  ExtractedDataset,
  ChartRecommendation,
  ChartConfig,
} from "@/types";

// Evident palette for chart series
const EVIDENT_COLORS = [
  "#F97316", // orange
  "#E6E2ED", // lavender
  "#60A5FA", // blue
  "#34D399", // green
  "#F472B6", // pink
  "#FBBF24", // amber
  "#A78BFA", // purple
  "#38BDF8", // sky
];

interface ChartPreviewProps {
  dataset: ExtractedDataset;
  recommendation: ChartRecommendation;
  onBack: () => void;
}

export default function ChartPreview({
  dataset,
  recommendation,
  onBack,
}: ChartPreviewProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const config: ChartConfig = {
    chartType: recommendation.chartType,
    title: recommendation.title,
    xKey: recommendation.xKey ?? dataset.columns[0].key,
    yKey: recommendation.yKey ?? dataset.columns[1]?.key ?? dataset.columns[0].key,
    seriesKey: recommendation.seriesKey,
    sourceNote: dataset.sourceName
      ? `Source: ${dataset.sourceName}`
      : undefined,
  };

  const chartData = dataset.rows.map((row) => {
    const point: Record<string, string | number | null> = {};
    dataset.columns.forEach((col) => {
      point[col.key] = row.values[col.key];
    });
    return point;
  });

  const handleExportPng = async () => {
    if (!chartRef.current) return;
    setExporting(true);
    try {
      const filename = `${config.title.replace(/[^a-z0-9]+/gi, "_")}.png`;
      await exportChartAsPng(chartRef.current, filename);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = () => {
    exportDatasetAsCsv(dataset);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="pill-cta pill-cta-secondary">
          <ArrowLeft size={14} />
          Back to Recommendations
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleExportPng}
            disabled={exporting}
            className="pill-cta pill-cta-primary"
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

      {/* Chart card */}
      <div ref={chartRef} className="chart-container">
        <div className="mb-4">
          <h2 className="text-base font-bold text-text-primary">
            {config.title}
          </h2>
        </div>

        <div className="h-[400px]">
          <ChartRenderer
            chartType={config.chartType}
            data={chartData}
            xKey={config.xKey}
            yKey={config.yKey}
            seriesKey={config.seriesKey}
            columns={dataset.columns}
          />
        </div>

        {/* Source note */}
        {config.sourceNote && (
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <p className="text-[0.65rem] text-text-muted">
              {config.sourceNote}
            </p>
          </div>
        )}
      </div>

      {/* Data summary */}
      <div className="card-flat p-4">
        <p className="section-label mb-2">Data Summary</p>
        <div className="flex gap-4 text-xs text-text-muted">
          <span>{dataset.rows.length} data points</span>
          <span>{dataset.columns.length} columns</span>
          <span>Chart: {recommendation.chartType.replace(/_/g, " ")}</span>
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
  columns: { key: string; label: string }[];
}

function ChartRenderer({
  chartType,
  data,
  xKey,
  yKey,
  seriesKey,
  columns,
}: ChartRendererProps) {
  const xLabel = columns.find((c) => c.key === xKey)?.label ?? xKey;
  const yLabel = columns.find((c) => c.key === yKey)?.label ?? yKey;
  const sLabel = seriesKey
    ? columns.find((c) => c.key === seriesKey)?.label ?? seriesKey
    : undefined;

  // Filter out null/undefined values for the y-axis
  const cleanData = data.filter(
    (d) => d[yKey] !== null && d[yKey] !== undefined && d[xKey] !== null
  );

  const axisStyle = {
    fontSize: 11,
    fill: "#94A3B8",
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#1E293B",
      border: "1px solid #334155",
      borderRadius: "0.5rem",
      fontSize: 12,
      color: "#F8FAFC",
    },
  };

  switch (chartType) {
    case "horizontal_bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={cleanData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1E293B"
              horizontal={false}
            />
            <XAxis type="number" tick={axisStyle} axisLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              width={75}
            />
            <Tooltip {...tooltipStyle} />
            <Bar
              dataKey={xKey}
              fill={EVIDENT_COLORS[0]}
              radius={[0, 4, 4, 0]}
              name={xLabel}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case "vertical_bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={cleanData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Bar
              dataKey={yKey}
              fill={EVIDENT_COLORS[0]}
              radius={[4, 4, 0, 0]}
              name={yLabel}
            />
          </BarChart>
        </ResponsiveContainer>
      );

    case "grouped_bar":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={cleanData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
            <Bar
              dataKey={yKey}
              fill={EVIDENT_COLORS[0]}
              radius={[4, 4, 0, 0]}
              name={yLabel}
            />
            {seriesKey && (
              <Bar
                dataKey={seriesKey}
                fill={EVIDENT_COLORS[1]}
                radius={[4, 4, 0, 0]}
                name={sLabel ?? seriesKey}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={cleanData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={EVIDENT_COLORS[0]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: EVIDENT_COLORS[0] }}
              name={yLabel}
            />
            {seriesKey && (
              <Line
                type="monotone"
                dataKey={seriesKey}
                stroke={EVIDENT_COLORS[1]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: EVIDENT_COLORS[1] }}
                name={sLabel ?? seriesKey}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    case "area":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={cleanData}
            margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={EVIDENT_COLORS[0]}
              fill={EVIDENT_COLORS[0]}
              fillOpacity={0.15}
              strokeWidth={2}
              name={yLabel}
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case "donut": {
      const pieData = cleanData.map((d) => ({
        name: String(d[xKey]),
        value: Number(d[yKey]) || 0,
      }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={150}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              stroke="none"
            >
              {pieData.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={EVIDENT_COLORS[i % EVIDENT_COLORS.length]}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis
              type="number"
              dataKey={xKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              name={xLabel}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              tick={axisStyle}
              axisLine={false}
              tickLine={false}
              name={yLabel}
            />
            <Tooltip {...tooltipStyle} />
            <Scatter
              data={cleanData}
              fill={EVIDENT_COLORS[0]}
              name={`${yLabel} vs ${xLabel}`}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full text-text-muted">
          Unsupported chart type: {chartType}
        </div>
      );
  }
}
