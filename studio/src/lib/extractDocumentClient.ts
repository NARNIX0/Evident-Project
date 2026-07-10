import type { FileExtractionResult } from "@/types";

/**
 * Client-side wrapper that sends the file to the server extraction API.
 * API keys stay on the server — never bundled into the browser.
 */
export async function extractDocumentViaApi(
  file: File
): Promise<FileExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });
  } catch {
    return {
      status: "error",
      error:
        "Could not reach the extraction service. Check your connection and try again.",
    };
  }

  let data: FileExtractionResult;
  try {
    data = (await response.json()) as FileExtractionResult;
  } catch {
    return {
      status: "error",
      error: "Received an invalid response from the extraction service.",
    };
  }

  if (!response.ok && data.status !== "error") {
    return {
      status: "error",
      error: "Extraction failed. Please try another file or input method.",
    };
  }

  return data;
}
