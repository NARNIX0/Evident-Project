import { describe, it, expect } from "vitest";
import {
  validateUploadFile,
  isAcceptedUpload,
  validateCsvUploadFile,
} from "../uploadValidation";
import { formatProviderErrors } from "../documentExtractor";
import { parseTextContentToDataset } from "../textDocumentExtractor";

function mockFile(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe("validateUploadFile", () => {
  it("accepts supported PDF, image, text, and Word types", () => {
    expect(
      validateUploadFile({
        name: "report.pdf",
        type: "application/pdf",
        size: 1024,
      })
    ).toBeNull();

    expect(
      validateUploadFile({
        name: "table.png",
        type: "image/png",
        size: 2048,
      })
    ).toBeNull();

    expect(
      validateUploadFile({
        name: "data.txt",
        type: "text/plain",
        size: 512,
      })
    ).toBeNull();

    expect(
      validateUploadFile({
        name: "report.docx",
        type:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 4096,
      })
    ).toBeNull();

    expect(
      validateUploadFile({
        name: "legacy.doc",
        type: "application/msword",
        size: 4096,
      })
    ).toBeNull();
  });

  it("rejects unsupported file types", () => {
    const error = validateUploadFile({
      name: "notes.md",
      type: "text/markdown",
      size: 100,
    });

    expect(error).toContain("Unsupported file type");
  });

  it("rejects files over 25 MB", () => {
    const error = validateUploadFile({
      name: "large.pdf",
      type: "application/pdf",
      size: 26 * 1024 * 1024,
    });

    expect(error).toContain("too large");
  });

  it("rejects empty files", () => {
    const error = validateUploadFile({
      name: "empty.pdf",
      type: "application/pdf",
      size: 0,
    });

    expect(error).toContain("empty");
  });

  it("accepts files by extension when MIME type is missing", () => {
    expect(
      isAcceptedUpload({ name: "scan.JPG", type: "application/octet-stream" })
    ).toBe(true);
    expect(
      isAcceptedUpload({ name: "table.txt", type: "application/octet-stream" })
    ).toBe(true);
  });
});

describe("validateCsvUploadFile", () => {
  it("accepts CSV and TSV for client-side batch upload", () => {
    expect(
      validateCsvUploadFile({
        name: "table.csv",
        type: "text/csv",
        size: 512,
      })
    ).toBeNull();

    expect(
      validateCsvUploadFile({
        name: "table.tsv",
        type: "text/tab-separated-values",
        size: 512,
      })
    ).toBeNull();

    expect(
      validateCsvUploadFile({
        name: "notes.pdf",
        type: "application/pdf",
        size: 512,
      })
    ).toContain("Unsupported file type");
  });
});

describe("parseTextContentToDataset", () => {
  it("parses tab-separated text into a dataset", async () => {
    const file = mockFile("metrics.txt", "text/plain", 100);
    const text = "Bank\tScore\nJPM\t82\nGS\t78";
    const result = await parseTextContentToDataset(text, file, "text-parser");

    expect(result.status).toBe("success");
    expect(result.dataset?.rows).toHaveLength(2);
    expect(result.dataset?.columns).toHaveLength(2);
    expect(result.dataset?.sourceType).toBe("file");
  });
});

describe("formatProviderErrors", () => {
  it("includes credential guidance when providers are not configured", () => {
    const message = formatProviderErrors([
      "azure-document-intelligence: credentials not configured",
      "mistral-ocr: credentials not configured",
    ]);

    expect(message).toContain("All extraction providers failed");
    expect(message).toContain("studio/.env");
  });

  it("includes extraction tips when providers fail at runtime", () => {
    const message = formatProviderErrors([
      "azure-document-intelligence: No tables found in the document.",
    ]);

    expect(message).toContain("paste the table manually");
    expect(message).not.toContain("studio/.env");
  });
});
