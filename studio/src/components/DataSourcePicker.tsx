"use client";

import { useState } from "react";
import {
  Database,
  Upload,
  ClipboardPaste,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { sampleDatasets } from "@/data/sampleDatasets";
import { parsePastedTable } from "@/lib/parseTable";
import { parseCsvFile } from "@/lib/parseCsvFile";
import { extractDocumentViaApi } from "@/lib/extractDocumentClient";
import {
  createBatchQueue,
  updateQueueItem,
  getNextPendingItem,
  isBatchComplete,
  hasReviewReadyItems,
  getReviewReadyDatasets,
  getReviewReadyVerifiedTables,
} from "@/lib/batchQueue";
import {
  CSV_ACCEPTED_EXTENSIONS,
  validateCsvUploadFile,
} from "@/lib/uploadValidation";
import FileUploadZone from "@/components/FileUploadZone";
import BatchUploadQueue from "@/components/BatchUploadQueue";
import ExtractedTablePicker from "@/components/ExtractedTablePicker";
import DatasetPreviewModal from "@/components/DatasetPreviewModal";
import { verifyCsvDatasetsViaApi } from "@/lib/verifyCsvClient";
import type {
  ExtractedDataset,
  BatchQueueItem,
  FileExtractionResult,
  VerifiedTable,
} from "@/types";

export interface DatasetSelectContext {
  datasets: ExtractedDataset[];
  allDatasets?: ExtractedDataset[];
  verifiedTables?: VerifiedTable[];
}

interface DataSourcePickerProps {
  onSelect: (dataset: ExtractedDataset, context?: DatasetSelectContext) => void;
}

type PickerMode = "sample" | "csv" | "paste" | "file";

export default function DataSourcePicker({ onSelect }: DataSourcePickerProps) {
  const [mode, setMode] = useState<PickerMode>("sample");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());
  const [queueItems, setQueueItems] = useState<BatchQueueItem[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [singleResult, setSingleResult] = useState<FileExtractionResult | null>(
    null
  );
  const [tablePicker, setTablePicker] = useState<{
    datasets: ExtractedDataset[];
    verifiedTables?: VerifiedTable[];
  } | null>(null);
  const [previewDataset, setPreviewDataset] = useState<ExtractedDataset | null>(
    null
  );
  const [selectedQueueIds, setSelectedQueueIds] = useState<Set<string>>(
    () => new Set()
  );

  const isBatch = selectedFiles.length > 1;
  const isSingleFile = selectedFiles.length === 1;
  const batchDone = isBatchComplete(queueItems);

  const clearUploadState = () => {
    setSelectedFiles([]);
    setFileMap(new Map());
    setQueueItems([]);
    setSingleResult(null);
    setTablePicker(null);
    setPreviewDataset(null);
    setSelectedQueueIds(new Set());
    setError(null);
  };

  const switchMode = (next: PickerMode) => {
    setMode(next);
    clearUploadState();
  };

  const handlePaste = () => {
    setError(null);
    try {
      const ds = parsePastedTable(pasteText);
      onSelect(ds);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse pasted table."
      );
    }
  };

  const handleFilesSelected = (
    files: File[],
    validate?: (file: Pick<File, "name" | "type" | "size">) => string | null
  ) => {
    setSelectedFiles(files);
    setSingleResult(null);
    setTablePicker(null);
    setError(null);

    if (files.length === 0) {
      setQueueItems([]);
      setFileMap(new Map());
      setSelectedQueueIds(new Set());
      return;
    }

    const { items, fileMap: map, errors } = createBatchQueue(files, validate);
    setQueueItems(items);
    setFileMap(map);
    setSelectedQueueIds(new Set());
    if (errors.length > 0) {
      setError(errors.join("\n"));
    }
  };

  const openTablePickerOrSelect = (result: FileExtractionResult) => {
    const datasets =
      result.datasets ?? (result.dataset ? [result.dataset] : []);
    if (datasets.length > 1) {
      setTablePicker({
        datasets,
        verifiedTables: result.verifiedTables,
      });
      return;
    }
    if (result.dataset) {
      onSelect(result.dataset);
    }
  };

  const processDocumentQueue = async () => {
    setExtracting(true);
    setError(null);

    let queue = [...queueItems];

    while (true) {
      const next = getNextPendingItem(queue);
      if (!next) break;

      queue = updateQueueItem(queue, next.id, { status: "extracting" });
      setQueueItems([...queue]);

      const file = fileMap.get(next.id);
      if (!file) {
        queue = updateQueueItem(queue, next.id, {
          status: "failed",
          error: "File not found in queue.",
        });
        setQueueItems([...queue]);
        continue;
      }

      try {
        const result = await extractDocumentViaApi(file);
        if (result.status === "success") {
          const datasets =
            result.datasets ?? (result.dataset ? [result.dataset] : []);
          if (datasets.length === 0) {
            queue = updateQueueItem(queue, next.id, {
              status: "failed",
              error: "No tables extracted.",
            });
          } else {
            queue = updateQueueItem(queue, next.id, {
              status: "review_ready",
              dataset: datasets[0],
              datasets: datasets.length > 1 ? datasets : undefined,
              verifiedTables: result.verifiedTables,
              confidence: result.confidence,
              source: result.source,
            });
            setSelectedQueueIds((prev) => new Set(prev).add(next.id));
          }
        } else {
          queue = updateQueueItem(queue, next.id, {
            status: "failed",
            error: result.error ?? "Extraction failed.",
          });
        }
      } catch (err) {
        queue = updateQueueItem(queue, next.id, {
          status: "failed",
          error:
            err instanceof Error ? err.message : "Unexpected extraction error.",
        });
      }

      setQueueItems([...queue]);
    }

    setExtracting(false);
  };

  const processCsvQueue = async () => {
    setExtracting(true);
    setError(null);

    let queue = [...queueItems];

    while (true) {
      const next = getNextPendingItem(queue);
      if (!next) break;

      queue = updateQueueItem(queue, next.id, { status: "extracting" });
      setQueueItems([...queue]);

      const file = fileMap.get(next.id);
      if (!file) {
        queue = updateQueueItem(queue, next.id, {
          status: "failed",
          error: "File not found in queue.",
        });
        setQueueItems([...queue]);
        continue;
      }

      try {
        const parsed = await parseCsvFile(file);
        const reviewed = await verifyCsvDatasetsViaApi([parsed]);
        const dataset = reviewed.datasets?.[0] ?? parsed;
        queue = updateQueueItem(queue, next.id, {
          status: "review_ready",
          dataset,
          datasets: [dataset],
          verifiedTables: reviewed.verifiedTables,
          confidence: dataset.qualityScore,
          source:
            reviewed.method === "csv-light-council"
              ? "csv-parser · light council"
              : "csv-parser",
        });
        setSelectedQueueIds((prev) => new Set(prev).add(next.id));
      } catch (err) {
        queue = updateQueueItem(queue, next.id, {
          status: "failed",
          error: err instanceof Error ? err.message : "Failed to parse CSV.",
        });
      }

      setQueueItems([...queue]);
    }

    setExtracting(false);
  };

  const handleSingleCsvParse = async () => {
    const file = selectedFiles[0];
    if (!file) return;

    if (singleResult?.status === "success") {
      const datasets =
        singleResult.datasets ??
        (singleResult.dataset ? [singleResult.dataset] : []);
      if (datasets.length > 1) {
        setTablePicker({
          datasets,
          verifiedTables: singleResult.verifiedTables,
        });
      } else if (datasets[0]) {
        setTablePicker({
          datasets,
          verifiedTables: singleResult.verifiedTables,
        });
      }
      return;
    }

    setExtracting(true);
    setSingleResult(null);
    setError(null);
    try {
      const parsed = await parseCsvFile(file);
      const reviewed = await verifyCsvDatasetsViaApi([parsed]);
      const dataset = reviewed.datasets?.[0] ?? parsed;
      setSingleResult({
        status: "success",
        dataset,
        datasets: [dataset],
        verifiedTables: reviewed.verifiedTables,
        confidence: dataset.qualityScore,
        source:
          reviewed.method === "csv-light-council"
            ? "csv-parser · light council"
            : "csv-parser",
      });
    } catch (err) {
      setSingleResult({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to parse CSV.",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSingleExtract = async () => {
    const file = selectedFiles[0];
    if (!file) return;

    if (singleResult?.status === "success") {
      openTablePickerOrSelect(singleResult);
      return;
    }

    setExtracting(true);
    setSingleResult(null);
    setTablePicker(null);
    try {
      const result = await extractDocumentViaApi(file);
      setSingleResult(result);
      if (result.status === "success") {
        const datasets =
          result.datasets ?? (result.dataset ? [result.dataset] : []);
        if (datasets.length > 1) {
          setTablePicker({
            datasets,
            verifiedTables: result.verifiedTables,
          });
        }
      }
    } catch (err) {
      setSingleResult({
        status: "error",
        error:
          err instanceof Error ? err.message : "Unexpected extraction error.",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handlePreviewItem = (item: BatchQueueItem) => {
    const ds = item.dataset ?? item.datasets?.[0];
    if (ds) setPreviewDataset(ds);
  };

  const handleContinueAllReady = () => {
    const datasets = getReviewReadyDatasets(queueItems, selectedQueueIds);
    if (datasets.length === 0) return;
    const verifiedTables = getReviewReadyVerifiedTables(
      queueItems,
      selectedQueueIds
    );
    setTablePicker({
      datasets,
      verifiedTables: verifiedTables.length > 0 ? verifiedTables : undefined,
    });
  };

  const selectedReadyCount = queueItems.filter(
    (item) =>
      item.status === "review_ready" && selectedQueueIds.has(item.id)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: "sample", label: "Sample Data", icon: <Database size={14} /> },
            { key: "csv", label: "Upload CSV", icon: <Upload size={14} /> },
            { key: "paste", label: "Paste Table", icon: <ClipboardPaste size={14} /> },
            { key: "file", label: "Upload File", icon: <FileUp size={14} /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchMode(tab.key)}
            className={`pill-cta ${
              mode === tab.key ? "pill-cta-primary" : "pill-cta-secondary"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300 whitespace-pre-line">
          {error}
        </div>
      )}

      {mode === "sample" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleDatasets.map((ds) => (
            <button
              key={ds.id}
              onClick={() => onSelect(ds)}
              className="card-elevated p-5 text-left group hover:border-accent-500 transition-colors"
            >
              <p className="section-label mb-2">Demo Dataset</p>
              <h3 className="text-text-primary font-semibold text-sm mb-2 group-hover:text-accent-400 transition-colors">
                {ds.name}
              </h3>
              <p className="text-text-muted text-xs mb-3">
                {ds.rows.length} rows · {ds.columns.length} columns
              </p>
              <div className="flex flex-wrap gap-2">
                {ds.columns.slice(0, 3).map((col) => (
                  <span
                    key={col.key}
                    className="text-[0.6rem] px-2 py-1 rounded-full bg-navy-800 text-text-muted border border-border-subtle"
                  >
                    {col.label}
                  </span>
                ))}
                {ds.columns.length > 3 && (
                  <span className="text-[0.6rem] px-2 py-1 rounded-full bg-navy-800 text-text-muted">
                    +{ds.columns.length - 3}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {mode === "paste" && (
        <div className="card-elevated p-6 space-y-4">
          <p className="text-text-secondary text-sm">
            Paste a table from a spreadsheet, markdown, or plain text. Use tabs,
            commas, or pipes as delimiters.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              "Bank\tAI Score\tInvestment\nJPMorgan\t82\t430\nGoldman\t78\t380"
            }
            className="w-full h-48 bg-navy-900 border border-border-medium rounded-lg p-4 text-sm text-text-secondary font-mono resize-none focus:outline-none focus:border-accent-500"
          />
          <button
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className="pill-cta pill-cta-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ClipboardPaste size={14} />
            Parse Table
          </button>
        </div>
      )}

      {tablePicker && (
        <ExtractedTablePicker
          datasets={tablePicker.datasets}
          verifiedTables={tablePicker.verifiedTables}
          onContinue={(selected) => {
            setTablePicker(null);
            onSelect(selected[0], {
              datasets: selected,
              allDatasets: tablePicker.datasets,
              verifiedTables: tablePicker.verifiedTables,
            });
          }}
          onCancel={() => setTablePicker(null)}
        />
      )}

      {mode === "csv" && !tablePicker && (
        <div className="space-y-4">
          <FileUploadZone
            selectedFiles={selectedFiles}
            onFilesSelected={(files) =>
              handleFilesSelected(files, validateCsvUploadFile)
            }
            acceptExtensions={CSV_ACCEPTED_EXTENSIONS}
            validateFile={validateCsvUploadFile}
            warningText="CSV/TSV files are parsed in your browser and never sent to OCR. Each file should have a header row. You can select multiple files at once."
            helpText="Use this for reconstructed fixture CSVs or exported tables. Multiple files are queued like document batch upload."
          />

          {isBatch && queueItems.length > 0 && (
            <>
              <BatchUploadQueue
                items={queueItems}
                onPreview={handlePreviewItem}
                selectedIds={selectedQueueIds}
                onSelectionChange={setSelectedQueueIds}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={processCsvQueue}
                  disabled={extracting || batchDone}
                  className="pill-cta pill-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extracting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Parsing…
                    </>
                  ) : batchDone ? (
                    <>
                      <CheckCircle2 size={14} />
                      Parsing Complete
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Parse All ({selectedFiles.length} files)
                    </>
                  )}
                </button>
                {batchDone && hasReviewReadyItems(queueItems) && (
                  <button
                    onClick={handleContinueAllReady}
                    disabled={selectedReadyCount === 0}
                    className="pill-cta pill-cta-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 size={14} />
                    Continue with selected ({selectedReadyCount})
                  </button>
                )}
              </div>
            </>
          )}

          {isSingleFile && (
            <>
              {singleResult?.status === "success" && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
                  <CheckCircle2
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm text-green-300 font-medium">
                      CSV parsed
                      {singleResult.source && ` (${singleResult.source})`}
                    </p>
                    {singleResult.dataset && (
                      <p className="text-xs text-green-400/80 mt-0.5">
                        {singleResult.dataset.rows.length} rows ·{" "}
                        {singleResult.dataset.columns.length} columns
                      </p>
                    )}
                  </div>
                </div>
              )}
              {singleResult?.status === "error" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
                  <AlertCircle
                    size={16}
                    className="text-red-400 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-sm text-red-300 whitespace-pre-line">
                    {singleResult.error}
                  </p>
                </div>
              )}

              <button
                onClick={handleSingleCsvParse}
                disabled={extracting}
                className="pill-cta pill-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extracting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Parsing…
                  </>
                ) : singleResult?.status === "success" ? (
                  <>
                    <CheckCircle2 size={14} />
                    Choose table &amp; continue
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Parse &amp; verify
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {mode === "file" && !tablePicker && (
        <div className="space-y-4">
          <FileUploadZone
            selectedFiles={selectedFiles}
            onFilesSelected={(files) => handleFilesSelected(files)}
          />

          {isBatch && queueItems.length > 0 && (
            <>
              <BatchUploadQueue
                items={queueItems}
                onPreview={handlePreviewItem}
                selectedIds={selectedQueueIds}
                onSelectionChange={setSelectedQueueIds}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={processDocumentQueue}
                  disabled={extracting || batchDone}
                  className="pill-cta pill-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extracting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Extracting…
                    </>
                  ) : batchDone ? (
                    <>
                      <CheckCircle2 size={14} />
                      Extraction Complete
                    </>
                  ) : (
                    <>
                      <FileUp size={14} />
                      Extract All ({selectedFiles.length} files)
                    </>
                  )}
                </button>
                {batchDone && hasReviewReadyItems(queueItems) && (
                  <button
                    onClick={handleContinueAllReady}
                    disabled={selectedReadyCount === 0}
                    className="pill-cta pill-cta-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 size={14} />
                    Continue with selected ({selectedReadyCount})
                  </button>
                )}
              </div>
            </>
          )}

          {isSingleFile && (
            <>
              {singleResult?.status === "success" && !tablePicker && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
                  <CheckCircle2
                    size={16}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm text-green-300 font-medium">
                      Extraction successful
                      {singleResult.source && ` (${singleResult.source})`}
                    </p>
                    {(singleResult.datasets?.length ?? 1) > 1 && (
                      <p className="text-xs text-green-400/80 mt-0.5">
                        {singleResult.datasets!.length} tables found — pick one below
                      </p>
                    )}
                    {singleResult.confidence != null && (
                      <p className="text-xs text-green-400/80 mt-0.5">
                        Confidence:{" "}
                        {(singleResult.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                    {singleResult.dataset && (
                      <p className="text-xs text-green-400/80 mt-0.5">
                        {singleResult.dataset.rows.length} rows ·{" "}
                        {singleResult.dataset.columns.length} columns
                      </p>
                    )}
                  </div>
                </div>
              )}
              {singleResult?.status === "error" && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
                  <AlertCircle
                    size={16}
                    className="text-red-400 mt-0.5 flex-shrink-0"
                  />
                  <p className="text-sm text-red-300 whitespace-pre-line">
                    {singleResult.error}
                  </p>
                </div>
              )}

              <button
                onClick={handleSingleExtract}
                disabled={extracting}
                className="pill-cta pill-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extracting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Extracting…
                  </>
                ) : singleResult?.status === "success" ? (
                  <>
                    <CheckCircle2 size={14} />
                    {(singleResult.datasets?.length ?? 1) > 1
                      ? "Choose Table"
                      : "Continue with Extracted Data"}
                  </>
                ) : (
                  <>
                    <FileUp size={14} />
                    Extract &amp; Continue
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}
    </div>
  );
}
