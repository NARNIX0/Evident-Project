import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reviewCsvDatasets } from "@/lib/agents/csvReview/pipeline";
import type { ExtractedDataset } from "@/types";

const ColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "percentage", "currency", "date"]),
});

const DatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceType: z.enum(["csv", "pasted", "demo", "file"]),
  extractionMethod: z.string(),
  columns: z.array(ColumnSchema).min(1),
  rows: z
    .array(
      z.object({
        id: z.string(),
        values: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
      })
    )
    .min(1),
  sourceName: z.string().optional(),
  sourcePage: z.number().optional(),
  notes: z.array(z.string()).optional(),
  tableCategory: z.string().optional(),
  qualityScore: z.number().optional(),
});

const BodySchema = z.object({
  datasets: z.array(DatasetSchema).min(1).max(30),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid CSV review payload.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await reviewCsvDatasets(
      parsed.data.datasets as ExtractedDataset[]
    );

    return NextResponse.json({
      status: "success",
      datasets: result.datasets,
      verifiedTables: result.verifiedTables,
      method: result.method,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "CSV review failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}
