import { NextRequest, NextResponse } from "next/server";
import { recommendChartsWithLlm } from "@/lib/llmChartRecommender";
import type { ExtractedDataset } from "@/types";

export const runtime = "nodejs";

interface RecommendRequestBody {
  dataset?: ExtractedDataset;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecommendRequestBody;

    if (!body.dataset) {
      return NextResponse.json(
        {
          status: "error",
          error: "Dataset is required for chart recommendations.",
        },
        { status: 422 }
      );
    }

    if (!body.dataset.rows?.length || body.dataset.columns.length < 2) {
      return NextResponse.json(
        {
          status: "error",
          error: "Dataset needs at least one row and two columns for recommendations.",
        },
        { status: 422 }
      );
    }

    const recommendations = await recommendChartsWithLlm(body.dataset);
    return NextResponse.json({ status: "success", recommendations });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Unexpected error while generating chart recommendations.",
      },
      { status: 500 }
    );
  }
}
