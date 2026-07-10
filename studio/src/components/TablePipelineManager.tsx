"use client";

import { useEffect, useState } from "react";
import { Settings2, Eye } from "lucide-react";
import type { ExtractedDataset, VerifiedTable } from "@/types";
import DatasetPreviewModal from "@/components/DatasetPreviewModal";
import { getTableDisplayLabel } from "@/lib/tableDisplayLabel";

interface TablePipelineManagerProps {
  allDatasets: ExtractedDataset[];
  pipelineIds: string[];
  verifiedTables?: VerifiedTable[];
  onPipelineChange: (selected: ExtractedDataset[]) => void;
}

export default function TablePipelineManager({
  allDatasets,
  pipelineIds,
  verifiedTables,
  onPipelineChange,
}: TablePipelineManagerProps) {
  const [open, setOpen] = useState(false);
  const [previewDataset, setPreviewDataset] = useState<ExtractedDataset | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(pipelineIds)
  );

  useEffect(() => {
    setSelectedIds(new Set(pipelineIds));
  }, [pipelineIds, open]);

  if (allDatasets.length <= 1) return null;

  const inPipeline = pipelineIds.length;
  const total = allDatasets.length;

  const toggleId = (id: string) => {
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

  const applyChanges = () => {
    const selected = allDatasets.filter((d) => selectedIds.has(d.id));
    if (selected.length > 0) {
      onPipelineChange(selected);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-accent-400 hover:text-accent-300 inline-flex items-center gap-1"
      >
        <Settings2 size={12} />
        Manage tables ({inPipeline}/{total} in pipeline)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pipeline-manager-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="card-elevated w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border-subtle">
              <h3
                id="pipeline-manager-title"
                className="text-base font-semibold text-text-primary"
              >
                Tables in this document
              </h3>
              <p className="text-xs text-text-muted mt-1">
                Select which tables to include in your review and charting
                pipeline. Preview data before adding or removing.
              </p>
            </div>

            <div className="overflow-auto flex-1 p-4 space-y-2">
              {allDatasets.map((dataset) => {
                const checked = selectedIds.has(dataset.id);
                const verified = verifiedTables?.find(
                  (vt) =>
                    vt.tableId === dataset.id ||
                    vt.cleanedDataset.id === dataset.id
                );
                return (
                  <div
                    key={dataset.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      checked
                        ? "border-accent-500/50 bg-accent-500/5"
                        : "border-border-subtle bg-navy-900/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(dataset.id)}
                      className="accent-accent-500"
                      aria-label={`Include ${getTableDisplayLabel(dataset)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {getTableDisplayLabel(dataset)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {dataset.rows.length} rows · {dataset.columns.length}{" "}
                        columns
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDataset(dataset)}
                      className="pill-cta pill-cta-secondary text-xs py-1 px-2"
                    >
                      <Eye size={12} />
                      Preview
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-border-subtle flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="pill-cta pill-cta-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyChanges}
                disabled={selectedIds.size === 0}
                className="pill-cta pill-cta-primary disabled:opacity-40"
              >
                Apply ({selectedIds.size} table
                {selectedIds.size === 1 ? "" : "s"})
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}
    </>
  );
}
