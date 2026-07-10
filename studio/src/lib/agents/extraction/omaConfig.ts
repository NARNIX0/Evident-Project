import type { AgentConfig } from "@open-multi-agent/core";
import { isLlmConfigured } from "@/lib/llmClient";
import {
  SEGMENTER_SYSTEM_PROMPT,
  PLANNER_SYSTEM_PROMPT,
  EXTRACTOR_SYSTEM_PROMPT,
  VALIDATOR_SYSTEM_PROMPT,
  CURATOR_SYSTEM_PROMPT,
} from "./prompts";
import {
  SegmentOutputSchema,
  PlanOutputSchema,
  ExtractOutputSchema,
  ValidateOutputSchema,
  CurateOutputSchema,
} from "./schemas";
import { MAX_LLM_CALLS_PER_EXTRACT } from "./limits";

export type CouncilAgentRole =
  | "segmenter"
  | "planner"
  | "extractor"
  | "validator"
  | "curator";

export const COUNCIL_AGENT_ROLES: CouncilAgentRole[] = [
  "segmenter",
  "planner",
  "extractor",
  "validator",
  "curator",
];

export function isAgentHarnessAvailable(): boolean {
  if (!isLlmConfigured()) return false;
  if (process.env.USE_AGENT_EXTRACTION === "false") return false;
  return true;
}

export function getMinimaxAgentDefaults(): Pick<
  AgentConfig,
  "model" | "provider" | "baseURL" | "apiKey" | "temperature" | "maxTurns"
> {
  const baseURL = process.env.LLM_BASE_URL?.replace(/\/$/, "");
  return {
    model: process.env.LLM_MODEL ?? "MiniMax-M3",
    provider: "openai",
    baseURL,
    apiKey: process.env.LLM_API_KEY,
    temperature: 0.15,
    maxTurns: 2,
  };
}

export function createExtractionAgents(): Record<CouncilAgentRole, AgentConfig> {
  const defaults = getMinimaxAgentDefaults();

  return {
    segmenter: {
      name: "research-analyst",
      ...defaults,
      systemPrompt: SEGMENTER_SYSTEM_PROMPT,
      outputSchema: SegmentOutputSchema,
    },
    planner: {
      name: "schema-architect",
      ...defaults,
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      outputSchema: PlanOutputSchema,
    },
    extractor: {
      name: "data-extractor",
      ...defaults,
      systemPrompt: EXTRACTOR_SYSTEM_PROMPT,
      outputSchema: ExtractOutputSchema,
    },
    validator: {
      name: "accuracy-auditor",
      ...defaults,
      systemPrompt: VALIDATOR_SYSTEM_PROMPT,
      outputSchema: ValidateOutputSchema,
    },
    curator: {
      name: "relevance-curator",
      ...defaults,
      systemPrompt: CURATOR_SYSTEM_PROMPT,
      outputSchema: CurateOutputSchema,
    },
  };
}

export function getCouncilCallBudget(): number {
  return MAX_LLM_CALLS_PER_EXTRACT;
}

export async function createExtractionOrchestrator() {
  const { OpenMultiAgent } = await import("@open-multi-agent/core");
  const defaults = getMinimaxAgentDefaults();

  return new OpenMultiAgent({
    defaultProvider: defaults.provider,
    defaultModel: defaults.model,
    defaultBaseURL: defaults.baseURL,
    onProgress:
      process.env.APP_ENV === "development"
        ? (event) => {
            console.log(
              `[extraction-council] ${event.type}`,
              event.agent ?? event.task ?? ""
            );
          }
        : undefined,
  });
}
