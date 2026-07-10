"use client";

import { FileText, ScanSearch } from "lucide-react";
import type { ExtractedDataset } from "@/types";
import { buildSourceMetadata } from "@/lib/sourceMetadata";

interface SourceTraceabilityProps {
  dataset: ExtractedDataset;
}

export default function SourceTraceability({ dataset }: SourceTraceabilityProps) {
  const meta = buildSourceMetadata(dataset);

  return (
    <div className="card-flat p-4">
      <p className="section-label mb-3">Source Traceability</p>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <MetadataItem
          icon={<FileText size={14} />}
          label="Source file"
          value={meta.fileName ?? "Not available"}
        />
        <MetadataItem
          icon={<ScanSearch size={14} />}
          label="Page"
          value={
            meta.pageNumber != null ? String(meta.pageNumber) : "Not available"
          }
        />
        <MetadataItem
          icon={<ScanSearch size={14} />}
          label="Extraction method"
          value={meta.extractionMethod}
        />
      </div>
      <p className="text-xs text-text-muted mt-3">{meta.displayLabel}</p>
    </div>
  );
}

function MetadataItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-accent-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-[0.65rem] uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <p className="text-text-secondary break-words">{value}</p>
      </div>
    </div>
  );
}
