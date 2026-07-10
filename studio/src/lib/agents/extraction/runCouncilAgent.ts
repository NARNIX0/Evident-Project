import type { AgentConfig, AgentRunResult } from "@open-multi-agent/core";
import type { OpenMultiAgent } from "@open-multi-agent/core";
import {
  recordCouncilAgentTurn,
  type CouncilAgentLogEntry,
} from "./councilLogger";

export async function runCouncilAgentWithLogging(
  orchestrator: OpenMultiAgent,
  agent: AgentConfig,
  userPrompt: string,
  step: number,
  agentRole: string
): Promise<AgentRunResult> {
  const started = Date.now();
  let result: AgentRunResult;

  try {
    result = await orchestrator.runAgent(agent, userPrompt);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown agent error";
    const entry: CouncilAgentLogEntry = {
      step,
      agentId: agent.name,
      agentRole,
      systemPrompt: agent.systemPrompt ?? "",
      userPrompt,
      success: false,
      rawOutput: "",
      structuredOutput: null,
      durationMs: Date.now() - started,
      error: message,
    };
    recordCouncilAgentTurn(entry);
    throw err;
  }

  const entry: CouncilAgentLogEntry = {
    step,
    agentId: agent.name,
    agentRole,
    systemPrompt: agent.systemPrompt ?? "",
    userPrompt,
    success: result.success ?? true,
    rawOutput: result.output ?? "",
    structuredOutput: result.structured ?? null,
    tokenUsage: result.tokenUsage,
    durationMs: Date.now() - started,
    error: result.success === false ? result.output : undefined,
  };
  recordCouncilAgentTurn(entry);

  return result;
}
