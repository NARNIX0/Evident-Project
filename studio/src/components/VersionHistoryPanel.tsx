"use client";

import { useState } from "react";
import { History, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { VersionHistoryState } from "@/types";
import { formatVersionLabel } from "@/lib/datasetVersionHistory";

interface VersionHistoryPanelProps {
  history: VersionHistoryState;
  onRestore: (versionId: string) => void;
}

export default function VersionHistoryPanel({
  history,
  onRestore,
}: VersionHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const versions = [...history.versions].reverse();

  return (
    <div className="card-flat">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-text-primary">
          <History size={14} className="text-accent-400" />
          Version History
          <span className="text-xs text-text-muted font-normal">
            ({history.versions.length})
          </span>
        </span>
        {open ? (
          <ChevronUp size={14} className="text-text-muted" />
        ) : (
          <ChevronDown size={14} className="text-text-muted" />
        )}
      </button>

      {open && (
        <div className="border-t border-border-subtle max-h-48 overflow-y-auto">
          {versions.map((version) => {
            const isActive = version.id === history.activeVersionId;
            return (
              <div
                key={version.id}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs border-b border-border-subtle last:border-b-0 ${
                  isActive ? "bg-navy-800" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-text-secondary truncate">
                    {formatVersionLabel(version)}
                  </p>
                  {version.changeCount > 0 && (
                    <p className="text-text-muted mt-0.5">
                      {version.changeCount} change
                      {version.changeCount === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => onRestore(version.id)}
                    className="pill-cta pill-cta-secondary text-[0.65rem] py-1 px-2 flex-shrink-0"
                  >
                    <RotateCcw size={10} />
                    Restore
                  </button>
                )}
                {isActive && (
                  <span className="text-accent-400 text-[0.65rem] flex-shrink-0">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
