"use client";

import ChartPreview from "@/components/ChartPreview";
import TablePipelineSwitcher from "@/components/TablePipelineSwitcher";
import TablePipelineManager from "@/components/TablePipelineManager";
import { useWorkflow } from "@/components/WorkflowProvider";
import { getTableDisplayLabel } from "@/lib/tableDisplayLabel";

export default function ChartStepPage() {
  const {
    dataset,
    selectedRec,
    pipelineDatasets,
    allExtractedDatasets,
    extractionVerifiedTables,
    activeDatasetId,
    setPipeline,
    switchTable,
    nextTable,
    hasNextTable,
    nextTableDataset,
    backToRecommend,
    goHome,
  } = useWorkflow();

  if (!dataset || !selectedRec) {
    return (
      <p className="text-sm text-text-muted">
        No chart selected. Go back to recommendations.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TablePipelineSwitcher
          datasets={pipelineDatasets}
          activeId={activeDatasetId ?? dataset.id}
          onSwitch={switchTable}
          label="Switch table to chart another dataset from this document"
        />
        <TablePipelineManager
          allDatasets={allExtractedDatasets}
          pipelineIds={pipelineDatasets.map((d) => d.id)}
          verifiedTables={extractionVerifiedTables}
          onPipelineChange={setPipeline}
        />
      </div>
      <ChartPreview
        dataset={dataset}
        recommendation={selectedRec}
        onBack={backToRecommend}
        onBackToHome={goHome}
        onNextTable={hasNextTable ? nextTable : undefined}
        nextTableLabel={
          nextTableDataset
            ? getTableDisplayLabel(nextTableDataset)
            : undefined
        }
      />
    </div>
  );
}
