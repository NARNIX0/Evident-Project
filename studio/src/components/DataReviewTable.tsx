"use client";

import { useState } from "react";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import type { ExtractedDataset, DatasetRow } from "@/types";

interface DataReviewTableProps {
  dataset: ExtractedDataset;
  onChange: (updated: ExtractedDataset) => void;
  onConfirm: () => void;
}

export default function DataReviewTable({
  dataset,
  onChange,
  onConfirm,
}: DataReviewTableProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    colKey: string;
  } | null>(null);

  const handleEdit = (
    rowId: string,
    colKey: string,
    value: string
  ) => {
    const numVal = value === "" ? null : isNaN(Number(value)) ? value : Number(value);
    const updatedRows = dataset.rows.map((row) =>
      row.id === rowId
        ? { ...row, values: { ...row.values, [colKey]: numVal } }
        : row
    );
    onChange({ ...dataset, rows: updatedRows });
  };

  const handleDeleteRow = (rowId: string) => {
    onChange({ ...dataset, rows: dataset.rows.filter((r) => r.id !== rowId) });
  };

  return (
    <div className="space-y-4">
      {/* Source metadata */}
      {dataset.sourceName && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="section-label">Source</span>
          <span className="px-2 py-0.5 rounded-full bg-navy-800 border border-border-subtle">
            {dataset.sourceName}
          </span>
          {dataset.extractionMethod && (
            <span className="px-2 py-0.5 rounded-full bg-navy-800 border border-border-subtle">
              {dataset.extractionMethod}
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {dataset.notes && dataset.notes.length > 0 && (
        <div className="bg-accent-500/5 border border-accent-500/20 rounded-lg px-4 py-3">
          {dataset.notes.map((note, i) => (
            <p key={i} className="text-xs text-accent-400/80">
              ⚠ {note}
            </p>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card-flat overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="w-8"></th>
              {dataset.columns.map((col) => (
                <th key={col.key}>
                  {col.label}
                  <span className="ml-1 text-text-muted/50 normal-case text-[0.6rem]">
                    {col.type}
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

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {dataset.rows.length} rows · {dataset.columns.length} columns · Click
          any cell to edit
        </p>
        <button onClick={onConfirm} className="pill-cta pill-cta-primary">
          Continue to Recommendations →
        </button>
      </div>
    </div>
  );
}
