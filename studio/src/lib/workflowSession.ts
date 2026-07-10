import type {
  AppStep,
  ChartRecommendation,
  ExtractedDataset,
  VerifiedTable,
} from "@/types";

export const WORKFLOW_SESSION_KEY = "evident-studio-workflow-v1";
export const WORKFLOW_SESSION_VERSION = 1 as const;

export interface WorkflowSessionSnapshot {
  version: typeof WORKFLOW_SESSION_VERSION;
  step: AppStep;
  pipelineDatasets: ExtractedDataset[];
  allExtractedDatasets: ExtractedDataset[];
  extractionVerifiedTables?: VerifiedTable[];
  activeDatasetId: string | null;
  recommendationsByDatasetId: Record<string, ChartRecommendation[]>;
  selectedRecByDatasetId: Record<string, ChartRecommendation>;
  updatedAt: string;
}

export function createEmptySession(
  step: AppStep = "input"
): WorkflowSessionSnapshot {
  return {
    version: WORKFLOW_SESSION_VERSION,
    step,
    pipelineDatasets: [],
    allExtractedDatasets: [],
    extractionVerifiedTables: undefined,
    activeDatasetId: null,
    recommendationsByDatasetId: {},
    selectedRecByDatasetId: {},
    updatedAt: new Date().toISOString(),
  };
}

export function isWorkflowSessionSnapshot(
  value: unknown
): value is WorkflowSessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<WorkflowSessionSnapshot>;
  return (
    v.version === WORKFLOW_SESSION_VERSION &&
    typeof v.step === "string" &&
    Array.isArray(v.pipelineDatasets) &&
    Array.isArray(v.allExtractedDatasets) &&
    (v.activeDatasetId === null || typeof v.activeDatasetId === "string") &&
    typeof v.recommendationsByDatasetId === "object" &&
    v.recommendationsByDatasetId != null &&
    typeof v.selectedRecByDatasetId === "object" &&
    v.selectedRecByDatasetId != null
  );
}

export function loadWorkflowSession(): WorkflowSessionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(WORKFLOW_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isWorkflowSessionSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkflowSession(snapshot: WorkflowSessionSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    const next: WorkflowSessionSnapshot = {
      ...snapshot,
      updatedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(WORKFLOW_SESSION_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore; in-memory state still works for the tab.
  }
}

export function clearWorkflowSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(WORKFLOW_SESSION_KEY);
  } catch {
    // ignore
  }
}
