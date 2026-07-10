"use client";

import { useEffect, useState } from "react";
import { Table2, AlertTriangle, ArrowRight, Eye } from "lucide-react";
import type { ExtractedDataset, VerifiedTable } from "@/types";
import DatasetPreviewModal from "@/components/DatasetPreviewModal";
import { getTableDisplayLabel } from "@/lib/tableDisplayLabel";

interface ExtractedTablePickerProps {
  datasets: ExtractedDataset[];
  verifiedTables?: VerifiedTable[];
  onContinue: (datasets: ExtractedDataset[]) => void;
  onCancel?: () => void;
}

function getMeta(
  dataset: ExtractedDataset,
  verifiedTables?: VerifiedTable[]
) {
  const verified = verifiedTables?.find(
    (vt) => vt.tableId === dataset.id || vt.cleanedDataset.id === dataset.id
  );
  return {
    category: verified?.category ?? dataset.tableCategory ?? "Other",
    qualityScore: verified?.qualityScore ?? dataset.qualityScore,
    issues: verified?.issues ?? dataset.verification?.issues ?? [],
  };
}

function qualityLabel(score: number | undefined): string {
  if (score == null) return "—";
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

export default function ExtractedTablePicker({
  datasets,
  verifiedTables,
  onContinue,
  onCancel,
}: ExtractedTablePickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(datasets.map((d) => d.id))
  );
  const [previewDataset, setPreviewDataset] = useState<ExtractedDataset | null>(
    null
  );

  useEffect(() => {
    setSelectedIds(new Set(datasets.map((d) => d.id)));
  }, [datasets]);

  const selectedCount = datasets.filter((d) => selectedIds.has(d.id)).length;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(datasets.map((d) => d.id)));
  };

  const handleContinue = () => {
    const selected = datasets.filter((d) => selectedIds.has(d.id));
    if (selected.length > 0) {
      onContinue(selected);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-text-secondary">
            {datasets.length} tables identified — preview each table, then select
            which to review and chart. You can change selection later in Review.
          </p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            className="text-accent-400 hover:text-accent-300"
          >
            Select all
          </button>
          <span className="text-text-muted">
            {selectedCount} of {datasets.length} selected
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {datasets.map((dataset) => {
            const meta = getMeta(dataset, verifiedTables);
            const lowQuality =
              meta.qualityScore != null && meta.qualityScore < 0.5;
            const isSelected = selectedIds.has(dataset.id);

            return (
              <div
                key={dataset.id}
                className={`card-elevated p-4 transition-colors ${
                  isSelected
                    ? "border-accent-500 ring-1 ring-accent-500/40"
                    : "opacity-80"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSelection(dataset.id)}
                    className="mt-1 flex-shrink-0"
                    aria-label={`${isSelected ? "Deselect" : "Select"} ${dataset.name}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="accent-accent-500 pointer-events-none"
                    />
                  </button>
                  <div className="w-9 h-9 rounded-lg bg-navy-800 border border-border-subtle text-accent-400 flex items-center justify-center flex-shrink-0">
                    <Table2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelection(dataset.id)}
                      className="text-left w-full"
                    >
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {getTableDisplayLabel(dataset)}
                  </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {dataset.rows.length} rows · {dataset.columns.length}{" "}
                        columns
                        {dataset.sourcePage != null &&
                          ` · Page ${dataset.sourcePage}`}
                      </p>
                    </button>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {meta.qualityScore != null && (
                        <span
                          className={`text-[0.6rem] px-2 py-0.5 rounded-full border ${
                            lowQuality
                              ? "bg-red-500/10 border-red-500/30 text-red-300"
                              : "bg-navy-800 border-border-subtle text-text-muted"
                          }`}
                        >
                          Quality: {qualityLabel(meta.qualityScore)}
                        </span>
                      )}
                    </div>
                    {meta.issues.length > 0 && (
                      <p className="text-xs text-amber-300 mt-2 flex items-start gap-1">
                        <AlertTriangle
                          size={12}
                          className="mt-0.5 flex-shrink-0"
                        />
                        {meta.issues[0]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setPreviewDataset(dataset)}
                    className="pill-cta pill-cta-secondary text-xs w-full justify-center"
                  >
                    <Eye size={12} />
                    Preview table
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={handleContinue}
            disabled={selectedCount === 0}
            className="pill-cta pill-cta-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight size={14} />
            Continue with {selectedCount} table{selectedCount === 1 ? "" : "s"}
          </button>
        </div>
      </div>

      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}
    </>
  );
}
