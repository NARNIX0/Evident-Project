import { z } from "zod";
import { EXTRACTION_TABLE_CATEGORIES } from "./categories";

const columnType = z.enum([
  "string",
  "number",
  "date",
  "percentage",
  "currency",
]);

const category = z.enum(EXTRACTION_TABLE_CATEGORIES);

const tableRowSchema = z.object({
  values: z.record(z.union([z.string(), z.number(), z.null()])),
  citations: z.record(z.string()).optional(),
});

const tableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: columnType,
});

export const validatedTableSchema = z.object({
  segmentId: z.string(),
  name: z.string(),
  category,
  description: z.string().optional(),
  qualityScore: z.number().min(0).max(1),
  chartable: z.boolean(),
  keep: z.boolean(),
  issues: z.array(z.string()),
  columns: z.array(tableColumnSchema),
  rows: z.array(tableRowSchema),
});

export const SegmentOutputSchema = z.object({
  documentSummary: z.string(),
  segments: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        "metrics",
        "people",
        "actions",
        "risks",
        "timeline",
        "narrative",
      ]),
      title: z.string(),
      sourceText: z.string(),
      chartable: z.boolean(),
      excludeFromTables: z.boolean().optional(),
    })
  ),
});

export const PlanOutputSchema = z.object({
  tables: z.array(
    z.object({
      segmentId: z.string(),
      name: z.string(),
      category,
      description: z.string(),
      columns: z.array(tableColumnSchema),
      expectedRowLabels: z.array(z.string()).optional(),
    })
  ),
});

export const ExtractOutputSchema = z.object({
  tables: z.array(
    z.object({
      segmentId: z.string(),
      name: z.string(),
      category,
      description: z.string().optional(),
      columns: z.array(tableColumnSchema),
      rows: z.array(tableRowSchema),
    })
  ),
});

export const ValidateOutputSchema = z.object({
  documentSummary: z.string().optional(),
  tables: z.array(validatedTableSchema),
});

export const CurateOutputSchema = z.object({
  councilSummary: z.string().optional(),
  tables: z.array(
    z.object({
      name: z.string(),
      keep: z.boolean(),
      relevanceScore: z.number().min(0).max(1),
      rationale: z.string(),
    })
  ),
});

export type SegmentOutput = z.infer<typeof SegmentOutputSchema>;
export type PlanOutput = z.infer<typeof PlanOutputSchema>;
export type ExtractOutput = z.infer<typeof ExtractOutputSchema>;
export type ValidateOutput = z.infer<typeof ValidateOutputSchema>;
export type CurateOutput = z.infer<typeof CurateOutputSchema>;
