import type { ExtractedDataset, DatasetVersion, VersionHistoryState } from "@/types";

let versionCounter = 0;

function nextVersionId(): string {
  versionCounter += 1;
  return `ver-${Date.now().toString(36)}-${versionCounter}`;
}

function cloneDataset(dataset: ExtractedDataset): ExtractedDataset {
  return structuredClone(dataset);
}

export function createInitialVersion(
  dataset: ExtractedDataset,
  description = "Imported dataset"
): VersionHistoryState {
  const version: DatasetVersion = {
    id: nextVersionId(),
    timestamp: new Date().toISOString(),
    description,
    changeCount: 0,
    dataset: cloneDataset(dataset),
  };

  return {
    versions: [version],
    activeVersionId: version.id,
  };
}

export function detectDatasetChanges(
  before: ExtractedDataset,
  after: ExtractedDataset
): { description: string; changeCount: number } {
  const changes: string[] = [];

  const beforeColKeys = new Set(before.columns.map((c) => c.key));
  const afterColKeys = new Set(after.columns.map((c) => c.key));

  for (const col of after.columns) {
    if (!beforeColKeys.has(col.key)) {
      changes.push(`Added column "${col.label}"`);
    }
  }
  for (const col of before.columns) {
    if (!afterColKeys.has(col.key)) {
      changes.push(`Removed column "${col.label}"`);
    }
  }

  const beforeRowIds = new Set(before.rows.map((r) => r.id));
  const afterRowIds = new Set(after.rows.map((r) => r.id));

  const addedRows = after.rows.filter((r) => !beforeRowIds.has(r.id)).length;
  const removedRows = before.rows.filter((r) => !afterRowIds.has(r.id)).length;

  if (addedRows > 0) {
    changes.push(addedRows === 1 ? "Added row" : `Added ${addedRows} rows`);
  }
  if (removedRows > 0) {
    changes.push(
      removedRows === 1 ? "Removed row" : `Removed ${removedRows} rows`
    );
  }

  for (const row of after.rows) {
    const prev = before.rows.find((r) => r.id === row.id);
    if (!prev) continue;

    for (const col of after.columns) {
      const prevVal = prev.values[col.key];
      const nextVal = row.values[col.key];
      if (prevVal !== nextVal) {
        const label = col.label;
        changes.push(`Edited ${label}`);
      }
    }
  }

  if (changes.length === 0) {
    return { description: "No changes", changeCount: 0 };
  }

  const unique = [...new Set(changes)];
  const description =
    unique.length <= 2 ? unique.join(", ") : `${unique[0]}, +${unique.length - 1} more`;

  return { description, changeCount: changes.length };
}

export function recordVersion(
  state: VersionHistoryState,
  dataset: ExtractedDataset,
  description: string,
  changeCount: number
): VersionHistoryState {
  if (changeCount === 0) {
    return state;
  }

  const version: DatasetVersion = {
    id: nextVersionId(),
    timestamp: new Date().toISOString(),
    description,
    changeCount,
    dataset: cloneDataset(dataset),
  };

  return {
    versions: [...state.versions, version],
    activeVersionId: version.id,
  };
}

export function restoreVersion(
  state: VersionHistoryState,
  versionId: string
): { state: VersionHistoryState; dataset: ExtractedDataset } | null {
  const target = state.versions.find((v) => v.id === versionId);
  if (!target) return null;

  const restored = cloneDataset(target.dataset);
  const label = formatVersionLabel(target);
  const nextState = recordVersion(
    state,
    restored,
    `Restored to ${label}`,
    1
  );

  return { state: nextState, dataset: restored };
}

export function formatVersionLabel(version: DatasetVersion): string {
  const date = new Date(version.timestamp);
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} — ${version.description}`;
}

export function getActiveVersion(
  state: VersionHistoryState
): DatasetVersion | undefined {
  return state.versions.find((v) => v.id === state.activeVersionId);
}
