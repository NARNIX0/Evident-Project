"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { recommendChartsViaApi } from "@/lib/recommendChartsClient";
import {
  clearWorkflowSession,
  createEmptySession,
  loadWorkflowSession,
  saveWorkflowSession,
  type WorkflowSessionSnapshot,
} from "@/lib/workflowSession";
import {
  pathForStep,
  resolveSafeStep,
  stepFromPath,
} from "@/lib/workflowRoutes";
import type {
  AppStep,
  ChartRecommendation,
  ExtractedDataset,
  VerifiedTable,
} from "@/types";
import type { DatasetSelectContext } from "@/components/DataSourcePicker";

interface WorkflowContextValue {
  hydrated: boolean;
  step: AppStep;
  pipelineDatasets: ExtractedDataset[];
  allExtractedDatasets: ExtractedDataset[];
  extractionVerifiedTables?: VerifiedTable[];
  activeDatasetId: string | null;
  dataset: ExtractedDataset | null;
  recommendations: ChartRecommendation[];
  selectedRec: ChartRecommendation | null;
  loadingRecs: boolean;
  selectDataset: (
    ds: ExtractedDataset,
    context?: DatasetSelectContext
  ) => void;
  updateDataset: (ds: ExtractedDataset) => void;
  setPipeline: (selected: ExtractedDataset[]) => Promise<void>;
  switchTable: (id: string) => Promise<void>;
  confirmData: () => Promise<void>;
  selectChart: (rec: ChartRecommendation) => void;
  nextTable: () => Promise<void>;
  hasNextTable: boolean;
  nextTableDataset: ExtractedDataset | null;
  goHome: () => void;
  goToStep: (step: AppStep) => void;
  backToReview: () => void;
  backToRecommend: () => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

function accessState(snapshot: WorkflowSessionSnapshot) {
  const active =
    snapshot.pipelineDatasets.find((d) => d.id === snapshot.activeDatasetId) ??
    null;
  const recs = active
    ? snapshot.recommendationsByDatasetId[active.id] ?? []
    : [];
  const selected = active
    ? snapshot.selectedRecByDatasetId[active.id] ?? null
    : null;
  return {
    hasPipeline: snapshot.pipelineDatasets.length > 0,
    hasActiveDataset: active != null,
    hasRecommendations: recs.length > 0,
    hasSelectedChart: selected != null,
  };
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkflowSessionSnapshot>(() =>
    createEmptySession()
  );
  const [loadingRecs, setLoadingRecs] = useState(false);

  const navigateTo = useCallback(
    (step: AppStep) => {
      const path = pathForStep(step);
      if (pathname !== path) {
        router.push(path);
      }
    },
    [pathname, router]
  );

  const persist = useCallback((next: WorkflowSessionSnapshot) => {
    setSnapshot(next);
    saveWorkflowSession(next);
  }, []);

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    const saved = loadWorkflowSession();
    if (saved) {
      setSnapshot(saved);
    }
    setHydrated(true);
  }, []);

  // Keep URL and session step in sync; redirect if step isn't reachable
  useEffect(() => {
    if (!hydrated) return;

    const requested = stepFromPath(pathname);
    const safe = resolveSafeStep(requested, accessState(snapshot));

    if (safe !== requested) {
      setSnapshot((prev) => {
        if (prev.step === safe) return prev;
        const next = { ...prev, step: safe };
        saveWorkflowSession(next);
        return next;
      });
      const path = pathForStep(safe);
      if (pathname !== path) {
        router.replace(path);
      }
      return;
    }

    if (snapshot.step !== requested) {
      setSnapshot((prev) => {
        if (prev.step === requested) return prev;
        const next = { ...prev, step: requested };
        saveWorkflowSession(next);
        return next;
      });
    }
  }, [
    hydrated,
    pathname,
    router,
    snapshot,
  ]);

  const activeDataset =
    snapshot.pipelineDatasets.find((d) => d.id === snapshot.activeDatasetId) ??
    null;

  const recommendations = activeDataset
    ? snapshot.recommendationsByDatasetId[activeDataset.id] ?? []
    : [];

  const selectedRec = activeDataset
    ? snapshot.selectedRecByDatasetId[activeDataset.id] ?? null
    : null;

  const loadRecommendations = useCallback(
    async (
      ds: ExtractedDataset,
      base: WorkflowSessionSnapshot
    ): Promise<WorkflowSessionSnapshot> => {
      const cached = base.recommendationsByDatasetId[ds.id];
      if (cached?.length) {
        return base;
      }

      setLoadingRecs(true);
      try {
        const recs = await recommendChartsViaApi(ds);
        return {
          ...base,
          recommendationsByDatasetId: {
            ...base.recommendationsByDatasetId,
            [ds.id]: recs,
          },
        };
      } finally {
        setLoadingRecs(false);
      }
    },
    []
  );

  const selectDataset = useCallback(
    (ds: ExtractedDataset, context?: DatasetSelectContext) => {
      const pipeline = context?.datasets?.length ? context.datasets : [ds];
      const all = context?.allDatasets?.length ? context.allDatasets : pipeline;
      const next: WorkflowSessionSnapshot = {
        ...createEmptySession("review"),
        pipelineDatasets: pipeline,
        allExtractedDatasets: all,
        extractionVerifiedTables: context?.verifiedTables,
        activeDatasetId: ds.id,
        step: "review",
      };
      persist(next);
      navigateTo("review");
    },
    [persist, navigateTo]
  );

  const updateDataset = useCallback(
    (ds: ExtractedDataset) => {
      const pipeline = snapshot.pipelineDatasets.map((d) =>
        d.id === ds.id ? ds : d
      );
      const all = snapshot.allExtractedDatasets.map((d) =>
        d.id === ds.id ? ds : d
      );
      const { [ds.id]: _dropRecs, ...recsRest } =
        snapshot.recommendationsByDatasetId;
      const { [ds.id]: _dropSel, ...selRest } = snapshot.selectedRecByDatasetId;
      void _dropRecs;
      void _dropSel;
      persist({
        ...snapshot,
        pipelineDatasets: pipeline,
        allExtractedDatasets: all,
        recommendationsByDatasetId: recsRest,
        selectedRecByDatasetId: selRest,
      });
    },
    [snapshot, persist]
  );

  const setPipeline = useCallback(
    async (selected: ExtractedDataset[]) => {
      if (selected.length === 0) return;
      const activeStill = selected.some((d) => d.id === snapshot.activeDatasetId);
      const nextActive = activeStill
        ? selected.find((d) => d.id === snapshot.activeDatasetId)!
        : selected[0];

      let next: WorkflowSessionSnapshot = {
        ...snapshot,
        pipelineDatasets: selected,
        activeDatasetId: nextActive.id,
      };

      if (snapshot.step === "recommend" || snapshot.step === "chart") {
        const hasSel = Boolean(next.selectedRecByDatasetId[nextActive.id]);
        const hasRecs = Boolean(
          next.recommendationsByDatasetId[nextActive.id]?.length
        );
        if (hasSel) {
          next = { ...next, step: "chart" };
        } else {
          next = { ...next, step: "recommend" };
          if (!hasRecs) {
            next = await loadRecommendations(nextActive, next);
          }
        }
      }

      persist(next);
      navigateTo(next.step);
    },
    [snapshot, persist, navigateTo, loadRecommendations]
  );

  const switchTable = useCallback(
    async (id: string) => {
      const nextDs = snapshot.pipelineDatasets.find((d) => d.id === id);
      if (!nextDs) return;

      let next: WorkflowSessionSnapshot = {
        ...snapshot,
        activeDatasetId: id,
      };

      if (snapshot.step === "recommend" || snapshot.step === "chart") {
        const hasSel = Boolean(next.selectedRecByDatasetId[id]);
        const hasRecs = Boolean(next.recommendationsByDatasetId[id]?.length);
        if (hasSel) {
          next = { ...next, step: "chart" };
        } else {
          next = { ...next, step: "recommend" };
          if (!hasRecs) {
            next = await loadRecommendations(nextDs, next);
          }
        }
      }

      persist(next);
      navigateTo(next.step);
    },
    [snapshot, persist, navigateTo, loadRecommendations]
  );

  const confirmData = useCallback(async () => {
    if (!activeDataset) return;
    let next: WorkflowSessionSnapshot = {
      ...snapshot,
      step: "recommend",
    };
    next = await loadRecommendations(activeDataset, next);
    persist(next);
    navigateTo("recommend");
  }, [activeDataset, snapshot, loadRecommendations, persist, navigateTo]);

  const selectChart = useCallback(
    (rec: ChartRecommendation) => {
      if (!activeDataset) return;
      persist({
        ...snapshot,
        step: "chart",
        selectedRecByDatasetId: {
          ...snapshot.selectedRecByDatasetId,
          [activeDataset.id]: rec,
        },
      });
      navigateTo("chart");
    },
    [activeDataset, snapshot, persist, navigateTo]
  );

  const currentIndex = activeDataset
    ? snapshot.pipelineDatasets.findIndex((d) => d.id === activeDataset.id)
    : -1;
  const nextTableDataset =
    currentIndex >= 0 && currentIndex < snapshot.pipelineDatasets.length - 1
      ? snapshot.pipelineDatasets[currentIndex + 1]
      : null;

  const nextTable = useCallback(async () => {
    if (!nextTableDataset) return;
    await switchTable(nextTableDataset.id);
  }, [nextTableDataset, switchTable]);

  const goHome = useCallback(() => {
    clearWorkflowSession();
    persist(createEmptySession("input"));
    navigateTo("input");
  }, [persist, navigateTo]);

  const goToStep = useCallback(
    (step: AppStep) => {
      const safe = resolveSafeStep(step, accessState(snapshot));
      persist({ ...snapshot, step: safe });
      navigateTo(safe);
    },
    [snapshot, persist, navigateTo]
  );

  const backToReview = useCallback(() => {
    persist({ ...snapshot, step: "review" });
    navigateTo("review");
  }, [snapshot, persist, navigateTo]);

  const backToRecommend = useCallback(() => {
    persist({ ...snapshot, step: "recommend" });
    navigateTo("recommend");
  }, [snapshot, persist, navigateTo]);

  const value = useMemo<WorkflowContextValue>(
    () => ({
      hydrated,
      step: snapshot.step,
      pipelineDatasets: snapshot.pipelineDatasets,
      allExtractedDatasets: snapshot.allExtractedDatasets,
      extractionVerifiedTables: snapshot.extractionVerifiedTables,
      activeDatasetId: snapshot.activeDatasetId,
      dataset: activeDataset,
      recommendations,
      selectedRec,
      loadingRecs,
      selectDataset,
      updateDataset,
      setPipeline,
      switchTable,
      confirmData,
      selectChart,
      nextTable,
      hasNextTable: nextTableDataset != null,
      nextTableDataset,
      goHome,
      goToStep,
      backToReview,
      backToRecommend,
    }),
    [
      hydrated,
      snapshot,
      activeDataset,
      recommendations,
      selectedRec,
      loadingRecs,
      selectDataset,
      updateDataset,
      setPipeline,
      switchTable,
      confirmData,
      selectChart,
      nextTable,
      nextTableDataset,
      goHome,
      goToStep,
      backToReview,
      backToRecommend,
    ]
  );

  return (
    <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error("useWorkflow must be used within WorkflowProvider");
  }
  return ctx;
}
