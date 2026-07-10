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

export type SourceType = "csv" | "pasted" | "demo" | "file";

export interface ExtractedDataset {
  id: string;
  name: string;
  sourceType: SourceType;
  sourceName?: string;
  sourcePage?: number;
  tableIndex?: number;
  extractionMethod: string;
  columns: DatasetColumn[];
  rows: DatasetRow[];
  notes?: string[];
  verification?: ExtractionVerification;
  tableCategory?: string;
  qualityScore?: number;
}

export interface ExtractionVerification {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  verifiedBy?: "minimax-m3" | "skipped";
}

export interface VerifiedTable {
  tableId: string;
  category: string;
  qualityScore: number;
  issues: string[];
  cleanedDataset: ExtractedDataset;
}

export type CaptionGenerationMethod = "minimax-m3" | "rules-fallback";

export interface GeneratedCaption {
  headline: string;
  extractedFacts: string[];
  interpretation: string[];
  caveats: string[];
  sourceNote: string;
  generationMethod: CaptionGenerationMethod;
}

export type CaptionResult =
  | { status: "success"; caption: GeneratedCaption }
  | { status: "error"; error: string };

export type FileExtractionResult = {
  status: "success" | "error";
  dataset?: ExtractedDataset;
  datasets?: ExtractedDataset[];
  verifiedTables?: VerifiedTable[];
  error?: string;
  confidence?: number;
  source?: string;
};

export type BatchFileStatus =
  | "pending"
  | "extracting"
  | "review_ready"
  | "failed";

export interface BatchQueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: BatchFileStatus;
  dataset?: ExtractedDataset;
  datasets?: ExtractedDataset[];
  verifiedTables?: VerifiedTable[];
  error?: string;
  confidence?: number;
  source?: string;
}

export interface BatchQueueProgress {
  total: number;
  processed: number;
  ready: number;
  failed: number;
  label: string;
}

export interface DatasetVersion {
  id: string;
  timestamp: string;
  description: string;
  changeCount: number;
  dataset: ExtractedDataset;
}

export interface VersionHistoryState {
  versions: DatasetVersion[];
  activeVersionId: string;
}

export type ChartType =
  | "horizontal_bar"
  | "vertical_bar"
  | "grouped_bar"
  | "stacked_bar"
  | "line"
  | "donut"
  | "pie"
  | "area"
  | "stacked_area"
  | "combo"
  | "scatter"
  | "bubble"
  | "radar"
  | "treemap";

export type SlideContentMode = "chart_and_caption" | "chart_only";

export interface ChartRecommendation {
  chartType: ChartType;
  title: string;
  reason: string;
  xKey?: string;
  yKey?: string;
  seriesKey?: string;
  valueKeys?: string[];
  yAxisLabel?: string;
  chartLayout?: "year_pivot_lines";
  categoryKey?: string;
  confidence: number;
  generationMethod?: "minimax-m3" | "rules-fallback";
  /** Human-readable notes from the chart validator (repairs, warnings). */
  validationIssues?: string[];
  /** True when the validator repaired axes, metrics, or valueKeys. */
  repaired?: boolean;
  /** Columns actually encoded in this chart. */
  usedColumns?: string[];
  /** Columns present in the table but not shown. */
  unusedColumns?: string[];
  /** Why unused columns were omitted (redundant share, not chartable, etc.). */
  unusedJustification?: string;
  /** Fraction of table columns encoded (0–1). */
  encodingCoverage?: number;
}

export type ChartRecommendationResult =
  | { status: "success"; recommendations: ChartRecommendation[] }
  | { status: "error"; error: string };

export interface ChartConfig {
  chartType: ChartType;
  title: string;
  xKey: string;
  yKey: string;
  seriesKey?: string;
  valueKeys?: string[];
  yAxisLabel?: string;
  chartLayout?: "year_pivot_lines";
  categoryKey?: string;
  sourceNote?: string;
}

export type AppStep =
  | "input"
  | "review"
  | "recommend"
  | "chart"
  | "export";

export type ExportThemeId = "light" | "dark";
export type ExportPaletteId = "blue" | "orange";
export type ExportPresetId =
  | "light-blue"
  | "light-orange"
  | "dark-blue"
  | "dark-orange";

export interface ChartTheme {
  background: string;
  titleColor: string;
  seriesColors: string[];
  gridColor: string;
  axisColor: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  accentColor: string;
}

export interface SlideTheme {
  background: string;
  titleColor: string;
  bodyColor: string;
  mutedColor: string;
  accentColor: string;
  sourceColor: string;
}

export interface ExportPreset {
  id: ExportPresetId;
  theme: ExportThemeId;
  palette: ExportPaletteId;
  label: string;
  description: string;
  chart: ChartTheme;
  slide: SlideTheme;
}

export interface SlideExportPackage {
  title: string;
  chartDataUrl: string;
  caption?: GeneratedCaption;
  presetId: ExportPresetId;
  filename?: string;
  contentMode?: SlideContentMode;
  sourceNote?: string;
}
