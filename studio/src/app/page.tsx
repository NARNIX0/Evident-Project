"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import DataSourcePicker from "@/components/DataSourcePicker";
import DataReviewTable from "@/components/DataReviewTable";
import ChartRecommendationPanel from "@/components/ChartRecommendationPanel";
import ChartPreview from "@/components/ChartPreview";
import { recommendCharts } from "@/lib/chartRecommender";
import type { ExtractedDataset, ChartRecommendation, AppStep } from "@/types";

export default function Home() {
  const [step, setStep] = useState<AppStep>("input");
  const [dataset, setDataset] = useState<ExtractedDataset | null>(null);
  const [recommendations, setRecommendations] = useState<
    ChartRecommendation[]
  >([]);
  const [selectedRec, setSelectedRec] =
    useState<ChartRecommendation | null>(null);

  const handleSelectDataset = (ds: ExtractedDataset) => {
    setDataset(ds);
    setStep("review");
  };

  const handleConfirmData = () => {
    if (!dataset) return;
    const recs = recommendCharts(dataset);
    setRecommendations(recs);
    setStep("recommend");
  };

  const handleSelectChart = (rec: ChartRecommendation) => {
    setSelectedRec(rec);
    setStep("chart");
  };

  const handleBackToInput = () => {
    setStep("input");
    setDataset(null);
    setRecommendations([]);
    setSelectedRec(null);
  };

  const handleBackToReview = () => {
    setStep("review");
    setRecommendations([]);
    setSelectedRec(null);
  };

  const handleBackToRecommend = () => {
    setStep("recommend");
    setSelectedRec(null);
  };

  return (
    <AppShell step={step}>
      {/* Step: Input */}
      {step === "input" && (
        <div className="space-y-6">
          <div>
            <p className="section-label mb-1">Data Source</p>
            <h2 className="text-xl font-bold text-text-primary mb-1">
              Start with a sample, upload a CSV, or paste a table.
            </h2>
            <p className="text-sm text-text-muted">
              Your data stays in the browser — nothing is sent to any server.
            </p>
          </div>
          <DataSourcePicker onSelect={handleSelectDataset} />
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && dataset && (
        <div className="space-y-6">
          <div>
            <p className="section-label mb-1">Review Dataset</p>
            <h2 className="text-xl font-bold text-text-primary mb-1">
              {dataset.name}
            </h2>
            <p className="text-sm text-text-muted">
              Review and edit the extracted data before generating charts.
              Click any cell to edit values.
            </p>
          </div>
          <DataReviewTable
            dataset={dataset}
            onChange={setDataset}
            onConfirm={handleConfirmData}
          />
        </div>
      )}

      {/* Step: Recommend */}
      {step === "recommend" && (
        <ChartRecommendationPanel
          recommendations={recommendations}
          onSelect={handleSelectChart}
          onBack={handleBackToReview}
        />
      )}

      {/* Step: Chart */}
      {step === "chart" && dataset && selectedRec && (
        <ChartPreview
          dataset={dataset}
          recommendation={selectedRec}
          onBack={handleBackToRecommend}
        />
      )}
    </AppShell>
  );
}
