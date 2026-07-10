import type {
  ChartRecommendation,
  ExtractedDataset,
  GeneratedCaption,
  CaptionResult,
} from "@/types";
import { buildSourceNote } from "@/lib/sourceMetadata";
import { formatAxisValue } from "@/lib/chartFormatting";
import {
  formatCaptionMarkdown,
  parseCaptionPayload,
  type RawCaptionPayload,
} from "@/lib/captionFormatting";

export { formatCaptionMarkdown };

const MAX_ROWS_IN_PROMPT = 12;

export interface CaptionContext {
  datasetName: string;
  sourceNote: string;
  chartTitle: string;
  chartType: string;
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, string | number | null>[];
  metricKey?: string;
  metricLabel?: string;
  categoryKey?: string;
  categoryLabel?: string;
}

export function buildCaptionContext(
  dataset: ExtractedDataset,
  recommendation: ChartRecommendation
): CaptionContext {
  const xCol = dataset.columns.find((col) => col.key === recommendation.xKey);
  const yCol = dataset.columns.find((col) => col.key === recommendation.yKey);

  const metricCol =
    xCol?.type === "number" ||
    xCol?.type === "currency" ||
    xCol?.type === "percentage"
      ? xCol
      : yCol;
  const categoryCol = xCol?.type === "string" ? xCol : yCol?.type === "string" ? yCol : undefined;

  return {
    datasetName: dataset.name,
    sourceNote: buildSourceNote(dataset),
    chartTitle: recommendation.title,
    chartType: recommendation.chartType.replace(/_/g, " "),
    columns: dataset.columns.map((col) => ({
      key: col.key,
      label: col.label,
      type: col.type,
    })),
    rows: dataset.rows.slice(0, MAX_ROWS_IN_PROMPT).map((row) => row.values),
    metricKey: metricCol?.key,
    metricLabel: metricCol?.label,
    categoryKey: categoryCol?.key,
    categoryLabel: categoryCol?.label,
  };
}

export function generateFallbackCaption(
  context: CaptionContext
): GeneratedCaption {
  const facts: string[] = [];

  if (
    context.metricKey &&
    context.categoryKey &&
    context.metricLabel &&
    context.categoryLabel &&
    context.rows.length > 0
  ) {
    const ranked = [...context.rows]
      .map((row) => ({
        category: row[context.categoryKey!],
        value: Number(row[context.metricKey!]),
      }))
      .filter((entry) => entry.category != null && !Number.isNaN(entry.value))
      .sort((a, b) => b.value - a.value);

    if (ranked.length > 0) {
      const top = ranked[0];
      const bottom = ranked[ranked.length - 1];
      facts.push(
        `${top.category} leads with ${formatAxisValue(top.value)} ${context.metricLabel}.`
      );
      if (ranked.length > 1) {
        facts.push(
          `${bottom.category} is lowest at ${formatAxisValue(bottom.value)} ${context.metricLabel}.`
        );
      }
      facts.push(
        `Dataset includes ${context.rows.length} ${context.categoryLabel} entries.`
      );
    }
  }

  if (facts.length === 0) {
    facts.push(
      `Table contains ${context.rows.length} rows across ${context.columns.length} columns.`
    );
    context.columns.forEach((col) => {
      facts.push(`Column "${col.label}" detected as ${col.type}.`);
    });
  }

  return {
    headline: context.chartTitle,
    extractedFacts: facts,
    interpretation: [
      `The ${context.chartType} highlights how ${context.metricLabel ?? "values"} vary across ${context.categoryLabel ?? "categories"} in the reviewed dataset.`,
    ],
    caveats: [
      "Caption generated from reviewed extracted data only; verify figures before external use.",
      "OCR or pasted tables may contain extraction errors — human review is required.",
      context.sourceNote.includes("demo")
        ? "This dataset is synthetic demo content, not proprietary Evident data."
        : "Do not treat this chart as representative of a broader population unless the source explicitly supports that.",
    ],
    sourceNote: context.sourceNote,
    generationMethod: "rules-fallback",
  };
}

export function normalizeCaptionPayload(
  payload: RawCaptionPayload,
  context: CaptionContext
): GeneratedCaption | null {
  const headline = payload.headline?.trim();
  const extractedFacts = (payload.extractedFacts ?? [])
    .map((fact) => fact.trim())
    .filter(Boolean);
  const interpretation = (payload.interpretation ?? [])
    .map((line) => line.trim())
    .filter(Boolean);
  const caveats = (payload.caveats ?? []).map((line) => line.trim()).filter(Boolean);

  if (!headline || extractedFacts.length === 0) {
    return null;
  }

  return {
    headline,
    extractedFacts,
    interpretation,
    caveats:
      caveats.length > 0
        ? caveats
        : [
            "Generated from extracted data only; verify before publishing externally.",
          ],
    sourceNote: context.sourceNote,
    generationMethod: "minimax-m3",
  };
}

export function collectDatasetNumbers(
  dataset: ExtractedDataset
): Set<string> {
  const numbers = new Set<string>();

  for (const row of dataset.rows) {
    for (const value of Object.values(row.values)) {
      if (typeof value === "number" && !Number.isNaN(value)) {
        numbers.add(String(value));
        numbers.add(formatAxisValue(value).replace(/[MK]$/, ""));
      }
    }
  }

  return numbers;
}

export function captionReferencesUnknownNumbers(
  caption: GeneratedCaption,
  dataset: ExtractedDataset
): boolean {
  const allowed = collectDatasetNumbers(dataset);
  const text = [
    caption.headline,
    ...caption.extractedFacts,
    ...caption.interpretation,
    ...caption.caveats,
  ].join(" ");

  const matches = text.match(/\d[\d,]*\.?\d*/g) ?? [];
  const significant = matches
    .map((value) => value.replace(/,/g, ""))
    .filter((value) => Number(value) > 0);

  if (significant.length === 0) {
    return false;
  }

  return significant.some((value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return false;
    }

    for (const allowedValue of allowed) {
      const allowedNum = Number(allowedValue.replace(/,/g, ""));
      if (!Number.isNaN(allowedNum) && Math.abs(allowedNum - numeric) < 0.01) {
        return false;
      }
    }

    return true;
  });
}

function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL);
}

function buildPrompt(context: CaptionContext): string {
  return `You are an analyst writing slide captions for financial-services research.

Write a caption using ONLY the data below. Do not invent metrics, rankings, dates, or populations not present in the data.

Return valid JSON with this exact shape:
{
  "headline": "short slide headline",
  "extractedFacts": ["bullet using only provided values", "..."],
  "interpretation": ["careful analyst interpretation grounded in the data"],
  "caveats": ["limitations, extraction uncertainty, or scope limits"]
}

Rules:
- extractedFacts must cite values that appear in the dataset rows.
- interpretation must not overclaim causation or representativeness.
- caveats must mention human review / extraction limits when relevant.
- Do not mention countries, companies, or metrics that are not in the data.

Chart: ${context.chartTitle} (${context.chartType})
Source: ${context.sourceNote}
Columns: ${context.columns.map((col) => `${col.label} (${col.type})`).join(", ")}
Rows:
${JSON.stringify(context.rows, null, 2)}`;
}

async function generateCaptionWithLlm(
  context: CaptionContext
): Promise<GeneratedCaption | null> {
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
      temperature: 0.2,
      thinking: { type: "disabled" },
      messages: [
        {
          role: "system",
          content:
            "You produce evidence-aware analyst captions as strict JSON only.",
        },
        { role: "user", content: buildPrompt(context) },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const payload = parseCaptionPayload(content);
  if (!payload) {
    return null;
  }

  return normalizeCaptionPayload(payload, context);
}

export async function generateCaption(
  dataset: ExtractedDataset,
  recommendation: ChartRecommendation
): Promise<CaptionResult> {
  const context = buildCaptionContext(dataset, recommendation);

  if (isLlmConfigured()) {
    try {
      const llmCaption = await generateCaptionWithLlm(context);
      if (
        llmCaption &&
        !captionReferencesUnknownNumbers(llmCaption, dataset)
      ) {
        return { status: "success", caption: llmCaption };
      }
    } catch {
      // Fall through to rules-based caption.
    }
  }

  return {
    status: "success",
    caption: generateFallbackCaption(context),
  };
}
