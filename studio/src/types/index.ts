/** Core data model types for Reports to Charts Studio. */

export type ColumnType =
  | "string"
  | "number"
  | "date"
  | "percentage"
  | "currency"
  | "unknown";

export interface DatasetColumn {
  key: string;
  label: string;
  type: ColumnType;
  unit?: string;
}

export interface DatasetRow {
  id: string;
  values: Record<string, string | number | null>;
  sourceSnippet?: string;
  confidence?: number;
}

export type SourceType = "csv" | "pasted" | "demo";

export interface ExtractedDataset {
  id: string;
  name: string;
  sourceType: SourceType;
  sourceName?: string;
  extractionMethod: string;
  columns: DatasetColumn[];
  rows: DatasetRow[];
  notes?: string[];
}

export type ChartType =
  | "horizontal_bar"
  | "vertical_bar"
  | "grouped_bar"
  | "line"
  | "donut"
  | "area"
  | "scatter";

export interface ChartRecommendation {
  chartType: ChartType;
  title: string;
  reason: string;
  xKey?: string;
  yKey?: string;
  seriesKey?: string;
  confidence: number;
}

export interface ChartConfig {
  chartType: ChartType;
  title: string;
  xKey: string;
  yKey: string;
  seriesKey?: string;
  sourceNote?: string;
}

export type AppStep =
  | "input"
  | "review"
  | "recommend"
  | "chart"
  | "export";
