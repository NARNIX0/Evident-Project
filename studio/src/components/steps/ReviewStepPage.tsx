"use client";

import DataReviewTable from "@/components/DataReviewTable";
import TablePipelineSwitcher from "@/components/TablePipelineSwitcher";
import TablePipelineManager from "@/components/TablePipelineManager";
import { useWorkflow } from "@/components/WorkflowProvider";
import { extractTableTitleFromName } from "@/lib/tableDisplayLabel";

export default function ReviewStepPage() {
  const {
    dataset,
    pipelineDatasets,
    allExtractedDatasets,
    extractionVerifiedTables,
    activeDatasetId,
    loadingRecs,
    updateDataset,
    setPipeline,
    switchTable,
    confirmData,
    goHome,
  } = useWorkflow();

  if (!dataset) {
    return (
      <p className="text-sm text-text-muted">
        No dataset in session. Start from the home page.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="section-label mb-1">Review Dataset</p>
        <h2 className="text-xl font-bold text-text-primary mb-1">
          {extractTableTitleFromName(dataset.name)}
        </h2>
        <p className="text-sm text-text-muted">
          Review and edit the extracted data before generating charts. Click any
          cell to edit values.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TablePipelineSwitcher
          datasets={pipelineDatasets}
          activeId={activeDatasetId ?? dataset.id}
          onSwitch={switchTable}
          label="Tables in this pipeline — switch to review and edit each"
        />
        <TablePipelineManager
          allDatasets={allExtractedDatasets}
          pipelineIds={pipelineDatasets.map((d) => d.id)}
          verifiedTables={extractionVerifiedTables}
          onPipelineChange={setPipeline}
        />
      </div>

      <DataReviewTable
        key={dataset.id}
        dataset={dataset}
        onChange={updateDataset}
        onConfirm={confirmData}
        onBackToHome={goHome}
        isConfirming={loadingRecs}
      />
    </div>
  );
}
