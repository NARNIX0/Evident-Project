"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ExtractedDataset } from "@/types";

const PREVIEW_ROW_LIMIT = 10;

interface DatasetPreviewModalProps {
  dataset: ExtractedDataset;
  onClose: () => void;
}

function formatCell(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

export default function DatasetPreviewModal({
  dataset,
  onClose,
}: DatasetPreviewModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = dataset.rows.slice(0, PREVIEW_ROW_LIMIT);
  const truncated = dataset.rows.length > PREVIEW_ROW_LIMIT;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dataset-preview-title"
      onClick={onClose}
    >
      <div
        className="card-elevated w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-4 border-b border-border-subtle">
          <div className="min-w-0">
            <h3
              id="dataset-preview-title"
              className="text-base font-semibold text-text-primary truncate"
            >
              {dataset.name}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              {dataset.rows.length} rows · {dataset.columns.length} columns
              {dataset.tableCategory && ` · ${dataset.tableCategory}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-navy-800"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {dataset.columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-3 py-2 border-b border-border-medium text-text-muted font-medium whitespace-nowrap"
                  >
                    {col.label}
                    <span className="block text-[0.65rem] font-normal opacity-70">
                      {col.type}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border-subtle/60">
                  {dataset.columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-2 text-text-secondary whitespace-nowrap max-w-[200px] truncate"
                      title={formatCell(row.values[col.key])}
                    >
                      {formatCell(row.values[col.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">
              No rows in this table.
            </p>
          )}
          {truncated && (
            <p className="text-xs text-text-muted mt-3 text-center">
              Showing first {PREVIEW_ROW_LIMIT} of {dataset.rows.length} rows.
              Full data available after you continue.
            </p>
          )}
        </div>

        <div className="p-4 border-t border-border-subtle flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="pill-cta pill-cta-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
