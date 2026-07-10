/** Shared upload allowlist for file upload UI and server validation. */

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".txt",
  ".doc",
  ".docx",
] as const;

/** Client-side CSV/TSV batch uploads (parsed in-browser, not sent to OCR). */
export const CSV_ACCEPTED_EXTENSIONS = [".csv", ".tsv"] as const;

export const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const CSV_ACCEPTED_MIME_TYPES = new Set([
  "text/csv",
  "text/tab-separated-values",
  "application/csv",
  "application/vnd.ms-excel",
]);

/** Max file size: 25 MB (matches upload UI). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function getFileExtension(
  fileName: string
): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ? `.${ext}` : "";
}

export function isTextUpload(file: Pick<File, "name" | "type">): boolean {
  const ext = getFileExtension(file.name);
  return ext === ".txt" || file.type === "text/plain";
}

export function isWordUpload(file: Pick<File, "name" | "type">): boolean {
  const ext = getFileExtension(file.name);
  return (
    ext === ".doc" ||
    ext === ".docx" ||
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export function isCsvUpload(file: Pick<File, "name" | "type">): boolean {
  const ext = getFileExtension(file.name);
  return (
    (CSV_ACCEPTED_EXTENSIONS as readonly string[]).includes(ext) ||
    CSV_ACCEPTED_MIME_TYPES.has(file.type)
  );
}

export function isAcceptedUpload(file: Pick<File, "name" | "type">): boolean {
  const ext = getFileExtension(file.name);
  return (
    ACCEPTED_MIME_TYPES.has(file.type) ||
    (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)
  );
}

function validateSize(file: Pick<File, "size">): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `File is too large (${sizeMb} MB). Maximum size is 25 MB.`;
  }

  if (file.size === 0) {
    return "The uploaded file is empty.";
  }

  return null;
}

export function validateUploadFile(
  file: Pick<File, "name" | "type" | "size">
): string | null {
  if (!isAcceptedUpload(file)) {
    return `Unsupported file type. Please upload ${ACCEPTED_EXTENSIONS.join(", ")} files only.`;
  }

  return validateSize(file);
}

export function validateCsvUploadFile(
  file: Pick<File, "name" | "type" | "size">
): string | null {
  if (!isCsvUpload(file)) {
    return `Unsupported file type. Please upload ${CSV_ACCEPTED_EXTENSIONS.join(", ")} files only.`;
  }

  return validateSize(file);
}

export const ACCEPTED_EXTENSIONS_LABEL = ACCEPTED_EXTENSIONS.join(", ");
export const CSV_ACCEPTED_EXTENSIONS_LABEL = CSV_ACCEPTED_EXTENSIONS.join(", ");
