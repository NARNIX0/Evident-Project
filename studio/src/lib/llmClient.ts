/**
 * Shared LLM client for server-side MiniMax calls.
 */

export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL);
}

export function parseJsonFromLlm<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const jsonText = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

export async function callLlm(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2
): Promise<string | null> {
  if (!isLlmConfigured()) {
    return null;
  }

  const apiKey = process.env.LLM_API_KEY!;
  const baseUrl = process.env.LLM_BASE_URL!.replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "MiniMax-M3";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    if (process.env.APP_ENV === "development") {
      const errText = await response.text();
      console.error(
        `[llmClient] ${response.status} ${model}:`,
        errText.slice(0, 300)
      );
    }
    return null;
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content as string) ?? null;
}

export async function callLlmJson<T>(
  systemPrompt: string,
  userPrompt: string
): Promise<T | null> {
  const content = await callLlm(systemPrompt, userPrompt);
  if (!content) return null;
  return parseJsonFromLlm<T>(content);
}
