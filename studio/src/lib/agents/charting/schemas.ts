import { z } from "zod";

const chartTypeEnum = z.enum([
  "horizontal_bar",
  "vertical_bar",
  "grouped_bar",
  "stacked_bar",
  "line",
  "area",
  "stacked_area",
  "combo",
  "pie",
  "donut",
  "scatter",
  "bubble",
  "radar",
  "treemap",
]);

export const ChartGoalSchema = z.enum([
  "comparison",
  "composition",
  "trend",
  "correlation",
  "multi_metric",
  "profile",
]);

export const EncodingStrategySchema = z.object({
  story: z.string().default("Compare metrics across categories"),
  primaryDimension: z.string().nullable().optional().default(null),
  mustEncodeMeasures: z.array(z.string()).default([]),
  optionalMeasures: z.array(z.string()).optional().default([]),
  dropColumns: z.array(z.string()).optional().default([]),
  dropReasons: z.array(z.string()).optional().default([]),
  preferredGoals: z
    .array(ChartGoalSchema)
    .optional()
    .default(["comparison", "multi_metric"]),
  requireMultiMetricChart: z.boolean().optional().default(false),
  notes: z.array(z.string()).optional().default([]),
});

export const ChartPlanItemSchema = z.object({
  goal: ChartGoalSchema.optional().default("comparison"),
  chartType: chartTypeEnum,
  title: z.string().default("Chart"),
  reason: z.string().default("Recommended from table shape."),
  xKey: z.string().optional(),
  yKey: z.string().optional(),
  seriesKey: z.string().optional(),
  valueKeys: z.array(z.string()).optional(),
  yAxisLabel: z.string().optional(),
  chartLayout: z.enum(["year_pivot_lines"]).optional(),
  categoryKey: z.string().optional(),
  usedColumns: z.array(z.string()).optional().default([]),
  unusedColumns: z.array(z.string()).optional().default([]),
  unusedJustification: z.string().optional(),
  confidence: z.number().min(0).max(1).optional().default(0.75),
});

export const ChartPlanSchema = z.object({
  recommendations: z.array(ChartPlanItemSchema).min(1).max(8),
});

export const ChartCritiqueItemSchema = z.object({
  index: z.number().int().nonnegative(),
  keep: z.boolean().optional().default(true),
  underEncoded: z.boolean().optional().default(false),
  issues: z.array(z.string()).optional().default([]),
  revisedValueKeys: z.array(z.string()).optional(),
  revisedChartType: chartTypeEnum.optional(),
  revisedTitle: z.string().optional(),
  revisedReason: z.string().optional(),
  confidenceAdjust: z.number().min(-0.4).max(0.2).optional().default(0),
});

export const ChartCritiqueSchema = z.object({
  critiques: z.array(ChartCritiqueItemSchema).default([]),
  coverageSummary: z.string().optional().default(""),
});

export type EncodingStrategy = z.infer<typeof EncodingStrategySchema>;
export type ChartPlanItem = z.infer<typeof ChartPlanItemSchema>;
export type ChartPlan = z.infer<typeof ChartPlanSchema>;
export type ChartCritique = z.infer<typeof ChartCritiqueSchema>;

export const MAX_CHART_COUNCIL_CALLS = 3;
