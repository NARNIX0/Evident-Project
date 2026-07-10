import { describe, it, expect } from "vitest";
import {
  canAccessStep,
  pathForStep,
  resolveSafeStep,
  stepFromPath,
} from "../workflowRoutes";
import {
  createEmptySession,
  isWorkflowSessionSnapshot,
} from "../workflowSession";

describe("workflowRoutes", () => {
  it("maps steps to paths and back", () => {
    expect(pathForStep("input")).toBe("/");
    expect(pathForStep("review")).toBe("/review");
    expect(pathForStep("recommend")).toBe("/recommend");
    expect(pathForStep("chart")).toBe("/chart");
    expect(stepFromPath("/review")).toBe("review");
    expect(stepFromPath("/chart/")).toBe("chart");
    expect(stepFromPath("/")).toBe("input");
  });

  it("blocks chart without a selected recommendation", () => {
    const state = {
      hasPipeline: true,
      hasActiveDataset: true,
      hasRecommendations: true,
      hasSelectedChart: false,
    };
    expect(canAccessStep("chart", state)).toBe(false);
    expect(resolveSafeStep("chart", state)).toBe("recommend");
  });

  it("falls back to input when pipeline is empty", () => {
    expect(
      resolveSafeStep("review", {
        hasPipeline: false,
        hasActiveDataset: false,
        hasRecommendations: false,
        hasSelectedChart: false,
      })
    ).toBe("input");
  });
});

describe("workflowSession", () => {
  it("creates a versioned empty session", () => {
    const empty = createEmptySession();
    expect(isWorkflowSessionSnapshot(empty)).toBe(true);
    expect(empty.step).toBe("input");
    expect(empty.pipelineDatasets).toEqual([]);
  });

  it("rejects invalid snapshots", () => {
    expect(isWorkflowSessionSnapshot({})).toBe(false);
    expect(isWorkflowSessionSnapshot(null)).toBe(false);
  });
});
