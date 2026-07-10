import type { AppStep } from "@/types";

export const WORKFLOW_PATHS: Record<AppStep, string> = {
  input: "/",
  review: "/review",
  recommend: "/recommend",
  chart: "/chart",
  export: "/chart",
};

export function pathForStep(step: AppStep): string {
  return WORKFLOW_PATHS[step];
}

export function stepFromPath(pathname: string): AppStep {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/review") return "review";
  if (normalized === "/recommend") return "recommend";
  if (normalized === "/chart") return "chart";
  return "input";
}

export function canAccessStep(
  step: AppStep,
  state: {
    hasPipeline: boolean;
    hasActiveDataset: boolean;
    hasRecommendations: boolean;
    hasSelectedChart: boolean;
  }
): boolean {
  switch (step) {
    case "input":
      return true;
    case "review":
      return state.hasPipeline && state.hasActiveDataset;
    case "recommend":
      return state.hasPipeline && state.hasActiveDataset;
    case "chart":
    case "export":
      return (
        state.hasPipeline &&
        state.hasActiveDataset &&
        state.hasSelectedChart
      );
    default:
      return false;
  }
}

/** If the requested step isn't reachable, return the furthest valid step. */
export function resolveSafeStep(
  requested: AppStep,
  state: {
    hasPipeline: boolean;
    hasActiveDataset: boolean;
    hasRecommendations: boolean;
    hasSelectedChart: boolean;
  }
): AppStep {
  const order: AppStep[] = ["input", "review", "recommend", "chart"];
  const normalized = requested === "export" ? "chart" : requested;
  const requestedIndex = order.indexOf(normalized);
  let safe: AppStep = "input";
  for (let i = 0; i <= requestedIndex; i++) {
    const step = order[i];
    if (canAccessStep(step, state)) {
      safe = step;
    } else {
      break;
    }
  }
  return safe;
}
