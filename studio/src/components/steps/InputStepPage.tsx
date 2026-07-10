"use client";

import DataSourcePicker from "@/components/DataSourcePicker";
import { useWorkflow } from "@/components/WorkflowProvider";

export default function InputStepPage() {
  const { selectDataset } = useWorkflow();

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">Data Source</p>
        <h2 className="text-xl font-bold text-text-primary mb-1 font-display">
          Start with a sample, upload a file, CSV, or paste a table.
        </h2>
        <p className="text-sm text-text-muted">
          Sample, CSV, and pasted data stay in the browser. You can batch-upload
          multiple CSV/TSV files the same way as documents. PDFs, images, Word
          docs, and text files are sent to the server for extraction. Your
          progress is kept if you refresh.
        </p>
      </div>
      <DataSourcePicker onSelect={selectDataset} />
    </div>
  );
}
