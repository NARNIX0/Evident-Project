"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Image, X, AlertTriangle } from "lucide-react";
import {
  validateUploadFile,
  ACCEPTED_EXTENSIONS,
  getFileExtension,
} from "@/lib/uploadValidation";

function getFileInfo(file: File): { icon: React.ReactNode; label: string } {
  const ext = getFileExtension(file.name);
  if (file.type === "application/pdf" || ext === ".pdf") {
    return { icon: <FileText size={20} />, label: "PDF Document" };
  }
  if (ext === ".csv") {
    return { icon: <FileText size={20} />, label: "CSV File" };
  }
  if (ext === ".tsv") {
    return { icon: <FileText size={20} />, label: "TSV File" };
  }
  if (ext === ".txt" || file.type === "text/plain") {
    return { icon: <FileText size={20} />, label: "Text File" };
  }
  if (ext === ".doc" || ext === ".docx") {
    return { icon: <FileText size={20} />, label: "Word Document" };
  }
  if (file.type.startsWith("image/")) {
    return { icon: <Image size={20} />, label: "Image" };
  }
  return { icon: <FileText size={20} />, label: "File" };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles?: File[];
  /** File input accept list (extensions). Defaults to document OCR types. */
  acceptExtensions?: readonly string[];
  validateFile?: (file: Pick<File, "name" | "type" | "size">) => string | null;
  warningText?: string;
  helpText?: string;
}

export default function FileUploadZone({
  onFilesSelected,
  selectedFiles = [],
  acceptExtensions = ACCEPTED_EXTENSIONS,
  validateFile = validateUploadFile,
  warningText = "Only upload public or non-confidential documents for this demo. PDFs and images use server OCR (Azure or Mistral). Text and Word files are parsed on the server for table data. You can select multiple files at once.",
  helpText = "Meeting notes and prose documents are auto-structured into tables. Delimited .txt/.docx also supported.",
}: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: File[]) => {
      setError(null);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of incoming) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
        } else {
          valid.push(file);
        }
      }

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      if (valid.length === 0) return;

      const names = new Set(selectedFiles.map((f) => f.name));
      const merged = [...selectedFiles];
      for (const file of valid) {
        if (!names.has(file.name)) {
          merged.push(file);
          names.add(file.name);
        }
      }

      onFilesSelected(merged);
    },
    [onFilesSelected, selectedFiles, validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) addFiles(files);
    },
    [addFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addFiles(files);
    e.target.value = "";
  };

  const handleRemove = (index: number) => {
    const next = selectedFiles.filter((_, i) => i !== index);
    onFilesSelected(next);
    setError(null);
  };

  const handleClearAll = () => {
    onFilesSelected([]);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
        <AlertTriangle
          size={16}
          className="text-amber-400 mt-0.5 flex-shrink-0"
        />
        <p className="text-xs text-amber-300 leading-relaxed">{warningText}</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          card-elevated p-10 text-center cursor-pointer transition-all
          border-dashed
          ${dragOver
            ? "border-accent-500 bg-surface-overlay"
            : "border-border-medium hover:border-accent-500 hover:bg-surface-overlay"
          }
        `}
        style={{ borderStyle: "dashed" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptExtensions.join(",")}
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <Upload
          size={36}
          className={`mx-auto mb-4 ${dragOver ? "text-accent-400" : "text-text-muted"}`}
        />
        <p className="text-sm text-text-secondary font-medium mb-1">
          {dragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs text-text-muted mb-2">
          or click to browse · multiple files supported
        </p>
        {helpText && (
          <p className="text-xs text-text-muted mb-4">{helpText}</p>
        )}
        <div className="flex justify-center gap-2 flex-wrap">
          {acceptExtensions.map((ext) => (
            <span
              key={ext}
              className="text-[0.6rem] px-2 py-1 rounded-full bg-navy-800 text-text-muted border border-border-subtle"
            >
              {ext}
            </span>
          ))}
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected
            </p>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-text-muted hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          </div>
          {selectedFiles.map((file, index) => {
            const info = getFileInfo(file);
            return (
              <div
                key={`${file.name}-${index}`}
                className="card-elevated p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-navy-800 border border-border-subtle text-accent-400 flex items-center justify-center flex-shrink-0">
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {info.label} · {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  className="p-2 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 whitespace-pre-line">
          {error}
        </div>
      )}
    </div>
  );
}
