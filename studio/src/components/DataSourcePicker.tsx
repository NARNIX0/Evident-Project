"use client";

import { useState, useRef } from "react";
import { Database, Upload, ClipboardPaste } from "lucide-react";
import { sampleDatasets } from "@/data/sampleDatasets";
import { parseCsv, parsePastedTable } from "@/lib/parseTable";
import type { ExtractedDataset } from "@/types";

interface DataSourcePickerProps {
  onSelect: (dataset: ExtractedDataset) => void;
}

export default function DataSourcePicker({ onSelect }: DataSourcePickerProps) {
  const [mode, setMode] = useState<"sample" | "csv" | "paste">("sample");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const ds = parseCsv(text, file.name);
        onSelect(ds);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV.");
      }
    };
    reader.readAsText(file);
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

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {(
          [
            { key: "sample", label: "Sample Data", icon: <Database size={14} /> },
            { key: "csv", label: "Upload CSV", icon: <Upload size={14} /> },
            { key: "paste", label: "Paste Table", icon: <ClipboardPaste size={14} /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setMode(tab.key);
              setError(null);
            }}
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Sample datasets */}
      {mode === "sample" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleDatasets.map((ds) => (
            <button
              key={ds.id}
              onClick={() => onSelect(ds)}
              className="card-elevated p-5 text-left group hover:border-accent-500/40 transition-colors"
            >
              <p className="section-label mb-2">Demo Dataset</p>
              <h3 className="text-text-primary font-semibold text-sm mb-2 group-hover:text-accent-400 transition-colors">
                {ds.name}
              </h3>
              <p className="text-text-muted text-xs mb-3">
                {ds.rows.length} rows · {ds.columns.length} columns
              </p>
              <div className="flex flex-wrap gap-1">
                {ds.columns.slice(0, 3).map((col) => (
                  <span
                    key={col.key}
                    className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted border border-border-subtle"
                  >
                    {col.label}
                  </span>
                ))}
                {ds.columns.length > 3 && (
                  <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-navy-800 text-text-muted">
                    +{ds.columns.length - 3}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* CSV upload */}
      {mode === "csv" && (
        <div className="card-elevated p-8 text-center">
          <Upload size={32} className="mx-auto mb-4 text-text-muted" />
          <p className="text-text-secondary text-sm mb-4">
            Upload a CSV file with a header row.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="pill-cta pill-cta-primary"
          >
            <Upload size={14} />
            Choose CSV File
          </button>
        </div>
      )}

      {/* Paste table */}
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
    </div>
  );
}
