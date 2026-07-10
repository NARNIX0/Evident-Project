"use client";

import ChartRecommendationPanel from "@/components/ChartRecommendationPanel";
import TablePipelineSwitcher from "@/components/TablePipelineSwitcher";
import TablePipelineManager from "@/components/TablePipelineManager";
import { useWorkflow } from "@/components/WorkflowProvider";

export default function RecommendStepPage() {
  const {
    dataset,
    pipelineDatasets,
    allExtractedDatasets,
    extractionVerifiedTables,
    activeDatasetId,
    recommendations,
    loadingRecs,
    setPipeline,
    switchTable,
    selectChart,
    backToReview,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TablePipelineSwitcher
          datasets={pipelineDatasets}
          activeId={activeDatasetId ?? dataset.id}
          onSwitch={switchTable}
          label="Switch table to review recommendations for another dataset"
        />
        <TablePipelineManager
          allDatasets={allExtractedDatasets}
          pipelineIds={pipelineDatasets.map((d) => d.id)}
          verifiedTables={extractionVerifiedTables}
          onPipelineChange={setPipeline}
        />
      </div>
      <ChartRecommendationPanel
        datasetName={dataset.name}
        recommendations={recommendations}
        loading={loadingRecs}
        columnLabels={Object.fromEntries(
          dataset.columns.map((col) => [col.key, col.label])
        )}
        onSelect={selectChart}
        onBack={backToReview}
        onBackToHome={goHome}
      />
    </div>
  );
}
