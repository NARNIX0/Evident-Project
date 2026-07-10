import type { FileExtractionResult } from "@/types";
import {
  COUNCIL_AGENT_ROLES,
  createExtractionAgents,
  createExtractionOrchestrator,
  getCouncilCallBudget,
  isAgentHarnessAvailable,
} from "./omaConfig";
import {
  buildCurateUserPrompt,
  buildExtractUserPrompt,
  buildPlanUserPrompt,
  buildSegmentUserPrompt,
  buildValidateUserPrompt,
} from "./prompts";
import type {
  CurateOutput,
  ExtractOutput,
  PlanOutput,
  SegmentOutput,
  ValidateOutput,
} from "./schemas";
import { applyDeterministicValidation } from "./deterministicValidation";
import {
  applyRelevanceBlocks,
  mergeCuratorDecisions,
} from "./tableRelevance";
import {
  convertValidatedToDatasets,
  datasetsToHarnessVerifiedTables,
} from "./convertToDatasets";
import {
  finishCouncilSession,
  startCouncilSession,
} from "./councilLogger";
import { runCouncilAgentWithLogging } from "./runCouncilAgent";

const MAX_TEXT_CHARS = 14_000;

function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_TEXT_CHARS)}\n\n[Document truncated for processing…]`;
}

export interface HarnessRunMeta {
  segmentCount: number;
  plannedTables: number;
  keptTables: number;
  llmCallsUsed: number;
  llmCallBudget: number;
  agentSteps: string[];
  councilSummary?: string;
  logSessionId?: string;
}

export async function runAgenticTableExtraction(
  text: string,
  file: File
): Promise<
  | { ok: true; result: FileExtractionResult; meta: HarnessRunMeta }
  | { ok: false; error: string; meta?: Partial<HarnessRunMeta> }
> {
  if (!isAgentHarnessAvailable()) {
    return { ok: false, error: "Agent harness not configured." };
  }

  const trimmed = truncateText(text.trim());
  if (!trimmed) {
    return { ok: false, error: "Empty document." };
  }

  const callBudget = getCouncilCallBudget();
  if (COUNCIL_AGENT_ROLES.length > callBudget) {
    return {
      ok: false,
      error: `Council has ${COUNCIL_AGENT_ROLES.length} agents but budget is ${callBudget} calls.`,
    };
  }

  const orchestrator = await createExtractionOrchestrator();
  const agents = createExtractionAgents();
  const steps: string[] = [];
  startCouncilSession(file.name);

  const segmentResult = await runCouncilAgentWithLogging(
    orchestrator,
    agents.segmenter,
    buildSegmentUserPrompt(file.name, trimmed),
    1,
    "Research Analyst"
  );
  steps.push("research-analyst");
  const segments = segmentResult.structured as SegmentOutput | undefined;
  if (!segments?.segments?.length) {
    finishCouncilSession("failure", { agentSteps: steps, llmCallsUsed: 1 }, "Research Analyst found no extractable document blocks.");
    return {
      ok: false,
      error: "Research Analyst found no extractable document blocks.",
      meta: { agentSteps: steps, llmCallsUsed: 1, llmCallBudget: callBudget },
    };
  }

  const planResult = await runCouncilAgentWithLogging(
    orchestrator,
    agents.planner,
    buildPlanUserPrompt(file.name, segments),
    2,
    "Schema Architect"
  );
  steps.push("schema-architect");
  const plan = planResult.structured as PlanOutput | undefined;
  if (!plan?.tables?.length) {
    finishCouncilSession("failure", { agentSteps: steps, segmentCount: segments.segments.length, llmCallsUsed: 2 }, "Schema Architect proposed no extractable tables.");
    return {
      ok: false,
      error: "Schema Architect proposed no extractable tables.",
      meta: {
        agentSteps: steps,
        segmentCount: segments.segments.length,
        llmCallsUsed: 2,
        llmCallBudget: callBudget,
      },
    };
  }

  const extractResult = await runCouncilAgentWithLogging(
    orchestrator,
    agents.extractor,
    buildExtractUserPrompt(file.name, trimmed, plan),
    3,
    "Data Extractor"
  );
  steps.push("data-extractor");
  const extracted = extractResult.structured as ExtractOutput | undefined;
  if (!extracted?.tables?.length) {
    finishCouncilSession("failure", {
      agentSteps: steps,
      segmentCount: segments.segments.length,
      plannedTables: plan.tables.length,
      llmCallsUsed: 3,
    }, "Data Extractor produced no table rows.");
    return {
      ok: false,
      error: "Data Extractor produced no table rows.",
      meta: {
        agentSteps: steps,
        segmentCount: segments.segments.length,
        plannedTables: plan.tables.length,
        llmCallsUsed: 3,
        llmCallBudget: callBudget,
      },
    };
  }

  const validateResult = await runCouncilAgentWithLogging(
    orchestrator,
    agents.validator,
    buildValidateUserPrompt(file.name, trimmed, extracted),
    4,
    "Accuracy Auditor"
  );
  steps.push("accuracy-auditor");
  const validatedRaw = validateResult.structured as ValidateOutput | undefined;
  if (!validatedRaw?.tables?.length) {
    finishCouncilSession("failure", {
      agentSteps: steps,
      segmentCount: segments.segments.length,
      plannedTables: plan.tables.length,
      llmCallsUsed: 4,
    }, "Accuracy Auditor rejected all tables.");
    return {
      ok: false,
      error: "Accuracy Auditor rejected all tables.",
      meta: {
        agentSteps: steps,
        segmentCount: segments.segments.length,
        plannedTables: plan.tables.length,
        llmCallsUsed: 4,
        llmCallBudget: callBudget,
      },
    };
  }

  const audited = applyDeterministicValidation({
    ...validatedRaw,
    documentSummary:
      validatedRaw.documentSummary ?? segments.documentSummary,
  });
  const relevanceFiltered = applyRelevanceBlocks(audited);

  const curateResult = await runCouncilAgentWithLogging(
    orchestrator,
    agents.curator,
    buildCurateUserPrompt(file.name, trimmed, relevanceFiltered),
    5,
    "Relevance Curator"
  );
  steps.push("relevance-curator");
  const curator = curateResult.structured as CurateOutput | undefined;

  const validated = curator?.tables?.length
    ? applyRelevanceBlocks(
        mergeCuratorDecisions(relevanceFiltered, curator)
      )
    : relevanceFiltered;

  const kept = validated.tables.filter((t) => t.keep);
  const datasets = convertValidatedToDatasets(
    { ...validated, tables: kept },
    file,
    segments.documentSummary
  );

  if (datasets.length === 0) {
    finishCouncilSession("failure", {
      agentSteps: steps,
      segmentCount: segments.segments.length,
      plannedTables: plan.tables.length,
      keptTables: 0,
      llmCallsUsed: callBudget,
      councilSummary: curator?.councilSummary,
    }, "Council rejected all tables as low-value or unverifiable.");
    return {
      ok: false,
      error:
        "Council rejected all tables as low-value or unverifiable. Try structured markdown/CSV or edit manually.",
      meta: {
        agentSteps: steps,
        segmentCount: segments.segments.length,
        plannedTables: plan.tables.length,
        keptTables: 0,
        llmCallsUsed: callBudget,
        llmCallBudget: callBudget,
        councilSummary: curator?.councilSummary,
      },
    };
  }

  const verifiedTables = datasetsToHarnessVerifiedTables(datasets, validated);
  const avgQuality =
    datasets.reduce((sum, d) => sum + (d.qualityScore ?? 0.7), 0) /
    datasets.length;

  const sessionId = finishCouncilSession("success", {
    segmentCount: segments.segments.length,
    plannedTables: plan.tables.length,
    keptTables: datasets.length,
    llmCallsUsed: callBudget,
    agentSteps: steps,
    councilSummary: curator?.councilSummary,
  });

  if (sessionId) {
    const logDir = `extraction-council-logs/${sessionId}`;
    datasets.forEach((ds) => {
      ds.notes = [
        ...(ds.notes ?? []),
        `Council deliberation log: ${logDir}/deliberation.md`,
      ];
    });
  }

  return {
    ok: true,
    meta: {
      segmentCount: segments.segments.length,
      plannedTables: plan.tables.length,
      keptTables: datasets.length,
      llmCallsUsed: callBudget,
      llmCallBudget: callBudget,
      agentSteps: steps,
      councilSummary: curator?.councilSummary,
      logSessionId: sessionId ?? undefined,
    },
    result: {
      status: "success",
      dataset: datasets[0],
      datasets,
      verifiedTables,
      confidence: avgQuality,
      source: "agent-harness-oma",
    },
  };
}
