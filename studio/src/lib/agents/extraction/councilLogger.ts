/**
 * Persist extraction-council deliberation logs for local testing.
 * Server-only. Writes under project root by default.
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface CouncilAgentLogEntry {
  step: number;
  agentId: string;
  agentRole: string;
  systemPrompt: string;
  userPrompt: string;
  success: boolean;
  rawOutput: string;
  structuredOutput: unknown;
  tokenUsage?: {
    input_tokens: number;
    output_tokens: number;
  };
  durationMs: number;
  error?: string;
}

export interface CouncilSessionLog {
  sessionId: string;
  startedAt: string;
  fileName: string;
  model: string;
  provider: string;
  outcome: "success" | "failure";
  error?: string;
  meta?: Record<string, unknown>;
  agents: CouncilAgentLogEntry[];
}

let activeSession: CouncilSessionLog | null = null;

export function isCouncilLoggingEnabled(): boolean {
  return process.env.EXTRACTION_COUNCIL_LOG !== "false";
}

export function getCouncilLogRootDir(): string {
  if (process.env.EXTRACTION_COUNCIL_LOG_DIR) {
    return path.resolve(process.env.EXTRACTION_COUNCIL_LOG_DIR);
  }
  // Next.js cwd is studio/ — project root is one level up
  return path.resolve(process.cwd(), "..", "extraction-council-logs");
}

export function startCouncilSession(fileName: string): CouncilSessionLog | null {
  if (!isCouncilLoggingEnabled()) return null;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
  activeSession = {
    sessionId: `${stamp}_${safeName}`,
    startedAt: new Date().toISOString(),
    fileName,
    model: process.env.LLM_MODEL ?? "MiniMax-M3",
    provider: process.env.LLM_PROVIDER ?? "openai_compatible",
    outcome: "failure",
    agents: [],
  };
  return activeSession;
}

export function recordCouncilAgentTurn(entry: CouncilAgentLogEntry): void {
  if (!activeSession) return;
  activeSession.agents.push(entry);
}

export function finishCouncilSession(
  outcome: "success" | "failure",
  meta?: Record<string, unknown>,
  error?: string
): string | null {
  if (!activeSession) return null;

  activeSession.outcome = outcome;
  activeSession.meta = meta;
  activeSession.error = error;

  const session = activeSession;
  activeSession = null;

  void persistCouncilSession(session);
  return session.sessionId;
}

function buildSummaryMarkdown(session: CouncilSessionLog): string {
  const lines = [
    `# Extraction Council Session`,
    ``,
    `- **Session:** ${session.sessionId}`,
    `- **File:** ${session.fileName}`,
    `- **Started:** ${session.startedAt}`,
    `- **Model:** ${session.model}`,
    `- **Outcome:** ${session.outcome}`,
  ];

  if (session.error) {
    lines.push(`- **Error:** ${session.error}`);
  }
  if (session.meta) {
    lines.push(`- **Meta:** \`${JSON.stringify(session.meta)}\``);
  }

  lines.push(``, `## Agent deliberation`, ``);

  for (const agent of session.agents) {
    lines.push(`### ${agent.step}. ${agent.agentRole} (\`${agent.agentId}\`)`);
    lines.push(
      `- Success: ${agent.success}`,
      `- Duration: ${agent.durationMs}ms`,
      agent.tokenUsage
        ? `- Tokens: ${agent.tokenUsage.input_tokens} in / ${agent.tokenUsage.output_tokens} out`
        : "",
      agent.error ? `- Error: ${agent.error}` : "",
      ``,
      `**System prompt**`,
      ``,
      "```",
      agent.systemPrompt.trim(),
      "```",
      ``,
      `**User prompt**`,
      ``,
      "```",
      agent.userPrompt.trim(),
      "```",
      ``,
      `**Structured output**`,
      ``,
      "```json",
      JSON.stringify(agent.structuredOutput ?? null, null, 2),
      "```",
      ``
    );

    if (agent.rawOutput && !agent.structuredOutput) {
      lines.push(`**Raw output**`, ``, "```", agent.rawOutput.trim(), "```", ``);
    }
  }

  return lines.filter((line) => line !== undefined).join("\n");
}

async function persistCouncilSession(session: CouncilSessionLog): Promise<void> {
  try {
    const root = getCouncilLogRootDir();
    const sessionDir = path.join(root, session.sessionId);
    await mkdir(sessionDir, { recursive: true });

    await writeFile(
      path.join(sessionDir, "session.json"),
      JSON.stringify(session, null, 2),
      "utf-8"
    );

    await writeFile(
      path.join(sessionDir, "deliberation.md"),
      buildSummaryMarkdown(session),
      "utf-8"
    );

    for (const agent of session.agents) {
      const fileName = `${String(agent.step).padStart(2, "0")}-${agent.agentId}.json`;
      await writeFile(
        path.join(sessionDir, fileName),
        JSON.stringify(agent, null, 2),
        "utf-8"
      );
    }

    if (process.env.APP_ENV === "development") {
      console.log(`[extraction-council] Logs written to ${sessionDir}`);
    }
  } catch (err) {
    console.error("[extraction-council] Failed to write logs:", err);
  }
}

/** @internal Reset between tests */
export function resetCouncilSessionForTests(): void {
  activeSession = null;
}
