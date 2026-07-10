"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, X, Columns3 } from "lucide-react";
import type { ExtractedDataset, DatasetRow, ColumnType, VersionHistoryState } from "@/types";
import VersionHistoryPanel from "@/components/VersionHistoryPanel";
import {
  createInitialVersion,
  detectDatasetChanges,
  recordVersion,
  restoreVersion,
} from "@/lib/datasetVersionHistory";

interface DataReviewTableProps {
  dataset: ExtractedDataset;
  onChange: (updated: ExtractedDataset) => void;
  onConfirm: () => void;
  onBackToHome: () => void;
  isConfirming?: boolean;
}

export default function DataReviewTable({
  dataset,
  onChange,
  onConfirm,
  onBackToHome,
  isConfirming = false,
}: DataReviewTableProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    colKey: string;
  } | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [newColType, setNewColType] = useState<ColumnType>("number");
  const [history, setHistory] = useState<VersionHistoryState | null>(null);
  const prevDatasetRef = useRef<ExtractedDataset | null>(null);

  useEffect(() => {
    const label = dataset.sourceName
      ? `Imported from ${dataset.sourceName}`
      : "Imported dataset";
    const initial = createInitialVersion(dataset, label);
    setHistory(initial);
    prevDatasetRef.current = dataset;
  }, [dataset.id]);

  const applyChange = (updated: ExtractedDataset) => {
    if (history && prevDatasetRef.current) {
      const change = detectDatasetChanges(prevDatasetRef.current, updated);
      const nextHistory = recordVersion(
        history,
        updated,
        change.description,
        change.changeCount
      );
      setHistory(nextHistory);
    }
    prevDatasetRef.current = updated;
    onChange(updated);
  };

  const handleRestore = (versionId: string) => {
    if (!history) return;
    const result = restoreVersion(history, versionId);
    if (!result) return;
    setHistory(result.state);
    prevDatasetRef.current = result.dataset;
    onChange(result.dataset);
  };

  const handleEdit = (rowId: string, colKey: string, value: string) => {
    const numVal =
      value === "" ? null : isNaN(Number(value)) ? value : Number(value);
    const updatedRows = dataset.rows.map((row) =>
      row.id === rowId
        ? { ...row, values: { ...row.values, [colKey]: numVal } }
        : row
    );
    applyChange({ ...dataset, rows: updatedRows });
  };

  const handleDeleteRow = (rowId: string) => {
    applyChange({
      ...dataset,
      rows: dataset.rows.filter((r) => r.id !== rowId),
    });
  };

  const handleAddRow = () => {
    const values: Record<string, string | number | null> = {};
    dataset.columns.forEach((col) => {
      values[col.key] = null;
    });
    const newRow: DatasetRow = {
      id: `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      values,
    };
    applyChange({ ...dataset, rows: [...dataset.rows, newRow] });
  };

  const handleAddColumn = () => {
    const label = newColLabel.trim();
    if (!label) return;
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (dataset.columns.some((c) => c.key === key)) return;

    const newCol = { key, label, type: newColType };
    const updatedRows = dataset.rows.map((row) => ({
      ...row,
      values: { ...row.values, [key]: null },
    }));
    applyChange({
      ...dataset,
      columns: [...dataset.columns, newCol],
      rows: updatedRows,
    });
    setNewColLabel("");
    setNewColType("number");
    setShowAddColumn(false);
  };

  const handleRemoveColumn = (colKey: string) => {
    const updatedCols = dataset.columns.filter((c) => c.key !== colKey);
    const updatedRows = dataset.rows.map((row) => {
      const { [colKey]: _, ...rest } = row.values;
      return { ...row, values: rest };
    });
    applyChange({ ...dataset, columns: updatedCols, rows: updatedRows });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowAddColumn(!showAddColumn)}
          className="pill-cta pill-cta-secondary text-xs"
        >
          <Columns3 size={12} />
          {showAddColumn ? "Cancel" : "Add Column"}
        </button>
        <button
          onClick={handleAddRow}
          className="pill-cta pill-cta-secondary text-xs"
        >
          <Plus size={12} />
          Add Row
        </button>
        {showAddColumn && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="bg-navy-900 border border-border-medium rounded-lg px-3 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent-500 w-40"
              placeholder="Column label"
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumn();
                if (e.key === "Escape") setShowAddColumn(false);
              }}
            />
            <select
              value={newColType}
              onChange={(e) => setNewColType(e.target.value as ColumnType)}
              className="bg-navy-900 border border-border-medium rounded-lg px-2 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-accent-500"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="percentage">Percentage</option>
              <option value="currency">Currency</option>
              <option value="date">Date</option>
            </select>
            <button
              onClick={handleAddColumn}
              disabled={!newColLabel.trim()}
              className="pill-cta pill-cta-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              Add
            </button>
          </div>
        )}
      </div>

      <div className="card-flat overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="w-8"></th>
              {dataset.columns.map((col) => (
                <th key={col.key}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <span className="text-text-muted/50 normal-case text-[0.6rem]">
                      {col.type}
                    </span>
                    <button
                      onClick={() => handleRemoveColumn(col.key)}
                      className="text-text-muted/20 hover:text-red-400 transition-colors ml-1"
                      title={`Remove "${col.label}" column`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                </th>
              ))}
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, ri) => (
              <tr key={row.id}>
                <td className="text-text-muted/40 text-xs text-center">
                  {ri + 1}
                </td>
                {dataset.columns.map((col) => {
                  const val = row.values[col.key];
                  const isEditing =
                    editingCell?.rowId === row.id &&
                    editingCell?.colKey === col.key;
                  return (
                    <td key={col.key}>
                      {isEditing ? (
                        <input
                          autoFocus
                          className="editable-cell"
                          defaultValue={val === null ? "" : String(val)}
                          onBlur={(e) => {
                            handleEdit(row.id, col.key, e.target.value);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleEdit(
                                row.id,
                                col.key,
                                (e.target as HTMLInputElement).value
                              );
                              setEditingCell(null);
                            }
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                        />
                      ) : (
                        <span
                          className="cursor-pointer hover:text-accent-400 transition-colors"
                          onClick={() =>
                            setEditingCell({ rowId: row.id, colKey: col.key })
                          }
                        >
                          {val === null || val === undefined ? (
                            <span className="text-text-muted/30 italic">
                              null
                            </span>
                          ) : (
                            String(val)
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td>
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="text-text-muted/30 hover:text-red-400 transition-colors p-1"
                    title="Delete row"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="pill-cta pill-cta-secondary text-xs"
          >
            ← Start Over
          </button>
          <p className="text-xs text-text-muted">
            {dataset.rows.length} rows · {dataset.columns.length} columns · Click
            any cell to edit
          </p>
        </div>
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          className="pill-cta pill-cta-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirming ? "Generating recommendations…" : "Continue to Recommendations →"}
        </button>
      </div>

      {(dataset.sourceName ||
        dataset.extractionMethod ||
        (dataset.verification &&
          (dataset.verification.issues.length > 0 ||
            dataset.verification.suggestions.length > 0)) ||
        history) && (
        <div className="pt-4 border-t border-border-subtle space-y-3">
          {(dataset.sourceName || dataset.extractionMethod) && (
            <p className="text-xs text-text-muted">
              {dataset.sourceName && <span>{dataset.sourceName}</span>}
              {dataset.sourceName && dataset.extractionMethod && (
                <span> · </span>
              )}
              {dataset.extractionMethod && (
                <span>{dataset.extractionMethod}</span>
              )}
            </p>
          )}

          {dataset.verification &&
            (dataset.verification.issues.length > 0 ||
              dataset.verification.suggestions.length > 0) && (
              <details className="text-xs text-text-muted">
                <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
                  Extraction notes (
                  {dataset.verification.issues.length +
                    dataset.verification.suggestions.length}
                  )
                </summary>
                <div className="mt-2 space-y-1 pl-1">
                  {dataset.verification.issues.map((issue, i) => (
                    <p key={`issue-${i}`} className="text-amber-300/90">
                      {issue}
                    </p>
                  ))}
                  {dataset.verification.suggestions.map((suggestion, i) => (
                    <p key={`sug-${i}`}>{suggestion}</p>
                  ))}
                </div>
              </details>
            )}

          {history && (
            <VersionHistoryPanel history={history} onRestore={handleRestore} />
          )}
        </div>
      )}
    </div>
  );
}
