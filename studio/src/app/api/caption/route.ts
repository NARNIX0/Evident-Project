import { NextRequest, NextResponse } from "next/server";
import { generateCaption } from "@/lib/captionService";
import type { ChartRecommendation, ExtractedDataset } from "@/types";

export const runtime = "nodejs";

interface CaptionRequestBody {
  dataset?: ExtractedDataset;
  recommendation?: ChartRecommendation;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CaptionRequestBody;

    if (!body.dataset || !body.recommendation) {
      return NextResponse.json(
        {
          status: "error",
          error: "Dataset and chart recommendation are required to generate a caption.",
        },
        { status: 422 }
      );
    }

    if (!body.dataset.rows?.length || !body.dataset.columns?.length) {
      return NextResponse.json(
        {
          status: "error",
          error: "Cannot generate a caption from an empty dataset.",
        },
        { status: 422 }
      );
    }

    const result = await generateCaption(body.dataset, body.recommendation);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error: "Unexpected error while generating caption.",
      },
      { status: 500 }
    );
  }
}
