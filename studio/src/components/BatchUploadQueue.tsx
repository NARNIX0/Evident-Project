"use client";

import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import type { BatchQueueItem } from "@/types";
import { getBatchProgress } from "@/lib/batchQueue";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusIcon({ status }: { status: BatchQueueItem["status"] }) {
  switch (status) {
    case "pending":
      return <Clock size={14} className="text-text-muted" />;
    case "extracting":
      return <Loader2 size={14} className="text-accent-400 animate-spin" />;
    case "review_ready":
      return <CheckCircle2 size={14} className="text-green-400" />;
    case "failed":
      return <AlertCircle size={14} className="text-red-400" />;
  }
}

function statusLabel(status: BatchQueueItem["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "extracting":
      return "Extracting";
    case "review_ready":
      return "Review Ready";
    case "failed":
      return "Failed";
  }
}

interface BatchUploadQueueProps {
  items: BatchQueueItem[];
  /** Opens a preview for one ready item (does not advance the workflow). */
  onPreview?: (item: BatchQueueItem) => void;
  /** @deprecated use onPreview */
  onReview?: (item: BatchQueueItem) => void;
  /** Selected review-ready item ids for Continue. */
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export default function BatchUploadQueue({
  items,
  onPreview,
  onReview,
  selectedIds,
  onSelectionChange,
}: BatchUploadQueueProps) {
  const progress = getBatchProgress(items);
  const previewHandler = onPreview ?? onReview;
  const selectionEnabled = Boolean(selectedIds && onSelectionChange);

  const readyItems = items.filter((item) => item.status === "review_ready");
  const selectedReadyCount = readyItems.filter((item) =>
    selectedIds?.has(item.id)
  ).length;

  const toggleItem = (id: string) => {
    if (!selectedIds || !onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      if (next.size <= 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const selectAllReady = () => {
    if (!onSelectionChange) return;
    onSelectionChange(new Set(readyItems.map((item) => item.id)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <span className="text-text-muted">{progress.label}</span>
        <div className="flex items-center gap-3">
          {progress.ready > 0 && (
            <span className="text-green-400">
              {progress.ready} ready for review
            </span>
          )}
          {selectionEnabled && readyItems.length > 0 && (
            <>
              <button
                type="button"
                onClick={selectAllReady}
                className="text-accent-400 hover:text-accent-300"
              >
                Select all ready
              </button>
              <span className="text-text-muted">
                {selectedReadyCount} of {readyItems.length} selected
              </span>
            </>
          )}
        </div>
      </div>

      <div className="card-flat divide-y divide-border-subtle">
        {items.map((item) => {
          const isReady = item.status === "review_ready";
          const isSelected = selectedIds?.has(item.id) ?? false;

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                selectionEnabled && isReady && isSelected
                  ? "bg-accent-500/5"
                  : ""
              }`}
            >
              {selectionEnabled && (
                <button
                  type="button"
                  onClick={() => isReady && toggleItem(item.id)}
                  disabled={!isReady}
                  className="flex-shrink-0 disabled:opacity-30"
                  aria-label={`${isSelected ? "Deselect" : "Select"} ${item.fileName}`}
                >
                  <input
                    type="checkbox"
                    checked={isReady && isSelected}
                    disabled={!isReady}
                    readOnly
                    className="accent-accent-500 pointer-events-none"
                  />
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-navy-800 border border-border-subtle text-accent-400 flex items-center justify-center flex-shrink-0">
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">
                  {item.fileName}
                </p>
                <p className="text-xs text-text-muted">
                  {formatFileSize(item.fileSize)}
                  {item.source ? ` · ${item.source}` : ""}
                </p>
                {item.status === "failed" && item.error && (
                  <p className="text-xs text-red-300 mt-1">{item.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                  <StatusIcon status={item.status} />
                  {statusLabel(item.status)}
                </span>
                {isReady && previewHandler && (
                  <button
                    onClick={() => previewHandler(item)}
                    className="pill-cta pill-cta-primary text-xs py-1 px-2"
                  >
                    Preview
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
