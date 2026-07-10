import { NextRequest, NextResponse } from "next/server";
import { extractAndVerifyDocument } from "@/lib/extractionPipeline";
import { validateUploadFile } from "@/lib/uploadValidation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          status: "error",
          error: "Invalid upload request. Please select a supported file.",
        },
        { status: 422 }
      );
    }

    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          status: "error",
          error: "No file provided. Please select a file to upload.",
        },
        { status: 422 }
      );
    }

    const upload = new File([file], file.name || "upload", {
      type: file.type || "application/octet-stream",
    });

    const validationError = validateUploadFile(upload);
    if (validationError) {
      return NextResponse.json(
        { status: "error", error: validationError },
        { status: 422 }
      );
    }

    const result = await extractAndVerifyDocument(upload);

    if (result.status === "error") {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        status: "error",
        error:
          "Unexpected server error during extraction. Please try again or use CSV/paste input.",
      },
      { status: 500 }
    );
  }
}
