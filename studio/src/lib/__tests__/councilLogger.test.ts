import { describe, it, expect, afterEach } from "vitest";
import {
  getCouncilLogRootDir,
  isCouncilLoggingEnabled,
  resetCouncilSessionForTests,
  startCouncilSession,
  recordCouncilAgentTurn,
  finishCouncilSession,
} from "../agents/extraction/councilLogger";

describe("councilLogger", () => {
  afterEach(() => {
    resetCouncilSessionForTests();
  });

  it("resolves log directory under project root", () => {
    const dir = getCouncilLogRootDir();
    expect(dir.endsWith("extraction-council-logs")).toBe(true);
    expect(dir).toContain("Evident-Project");
  });

  it("records agent turns in a session", () => {
    const session = startCouncilSession("test.txt");
    expect(session).not.toBeNull();

    recordCouncilAgentTurn({
      step: 1,
      agentId: "research-analyst",
      agentRole: "Research Analyst",
      systemPrompt: "Segment the document.",
      userPrompt: "File: test.txt",
      success: true,
      rawOutput: "{}",
      structuredOutput: { segments: [] },
      durationMs: 120,
    });

    const sessionId = finishCouncilSession("success", { keptTables: 2 });
    expect(sessionId).toContain("test.txt");
  });

  it("is enabled unless EXTRACTION_COUNCIL_LOG=false", () => {
    expect(isCouncilLoggingEnabled()).toBe(true);
  });
});
