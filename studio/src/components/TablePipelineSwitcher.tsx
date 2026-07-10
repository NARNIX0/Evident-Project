"use client";

import type { ExtractedDataset } from "@/types";
import { getTableDisplayLabel } from "@/lib/tableDisplayLabel";

interface TablePipelineSwitcherProps {
  datasets: ExtractedDataset[];
  activeId: string;
  onSwitch: (id: string) => void;
  label?: string;
}

export default function TablePipelineSwitcher({
  datasets,
  activeId,
  onSwitch,
  label = "Tables in this document",
}: TablePipelineSwitcherProps) {
  if (datasets.length <= 1) return null;

  const activeIndex = datasets.findIndex((d) => d.id === activeId);

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted">
        {label}
        {activeIndex >= 0 && (
          <span className="text-text-secondary">
            {" "}
            · {activeIndex + 1} of {datasets.length}
          </span>
        )}
      </p>
      <div className="flex gap-2 flex-wrap">
        {datasets.map((ds) => (
          <button
            key={ds.id}
            type="button"
            onClick={() => onSwitch(ds.id)}
            className={`pill-cta text-xs ${
              ds.id === activeId
                ? "pill-cta-primary"
                : "pill-cta-secondary"
            }`}
          >
            {getTableDisplayLabel(ds)}
          </button>
        ))}
      </div>
    </div>
  );
}
