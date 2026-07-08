import type { ExtractedDataset } from "@/types";

/**
 * Sample financial-services AI datasets for demo flow.
 * All data is synthetic/public — clearly labelled as demo content.
 */

let _idCounter = 0;
function rid(): string {
  return `row-${++_idCounter}`;
}

function makeDataset(
  partial: Omit<ExtractedDataset, "id">
): ExtractedDataset {
  return { id: `ds-${++_idCounter}`, ...partial };
}

export const sampleDatasets: ExtractedDataset[] = [
  makeDataset({
    name: "AI Adoption in Global Banks (2024)",
    sourceType: "demo",
    sourceName: "Evident AI Index — synthetic demo slice",
    extractionMethod: "demo-synthetic",
    notes: [
      "Synthetic demo data inspired by public Evident AI Index research.",
      "Not real proprietary figures — for demonstration only.",
    ],
    columns: [
      { key: "bank", label: "Bank", type: "string" },
      { key: "aiScore", label: "AI Adoption Score", type: "number" },
      { key: "talent", label: "AI Talent (FTEs)", type: "number" },
      {
        key: "investment",
        label: "AI Investment ($M)",
        type: "currency",
        unit: "$M",
      },
    ],
    rows: [
      { id: rid(), values: { bank: "JPMorgan Chase", aiScore: 82, talent: 2100, investment: 430 } },
      { id: rid(), values: { bank: "Goldman Sachs", aiScore: 78, talent: 1600, investment: 380 } },
      { id: rid(), values: { bank: "Morgan Stanley", aiScore: 74, talent: 1400, investment: 310 } },
      { id: rid(), values: { bank: "Citigroup", aiScore: 70, talent: 1200, investment: 260 } },
      { id: rid(), values: { bank: "Bank of America", aiScore: 68, talent: 1100, investment: 240 } },
      { id: rid(), values: { bank: "HSBC", aiScore: 65, talent: 950, investment: 210 } },
      { id: rid(), values: { bank: "Barclays", aiScore: 62, talent: 800, investment: 180 } },
      { id: rid(), values: { bank: "UBS", aiScore: 58, talent: 650, investment: 150 } },
    ],
  }),

  makeDataset({
    name: "GenAI Use Cases by Category",
    sourceType: "demo",
    sourceName: "Synthetic public research summary",
    extractionMethod: "demo-synthetic",
    notes: [
      "Illustrative breakdown of GenAI use-case categories in financial services.",
      "Percentages are synthetic estimates for demo purposes.",
    ],
    columns: [
      { key: "category", label: "Use-Case Category", type: "string" },
      { key: "share", label: "% of Deployments", type: "percentage" },
      { key: "maturity", label: "Maturity (1-5)", type: "number" },
    ],
    rows: [
      { id: rid(), values: { category: "Customer Service & Chatbots", share: 28, maturity: 4 } },
      { id: rid(), values: { category: "Fraud Detection & AML", share: 22, maturity: 5 } },
      { id: rid(), values: { category: "Document Processing & OCR", share: 18, maturity: 3 } },
      { id: rid(), values: { category: "Risk Modelling & Scoring", share: 14, maturity: 4 } },
      { id: rid(), values: { category: "Research & Report Automation", share: 10, maturity: 2 } },
      { id: rid(), values: { category: "Code Generation & DevOps", share: 8, maturity: 3 } },
    ],
  }),

  makeDataset({
    name: "Quarterly AI Patents Filed — Top Banks",
    sourceType: "demo",
    sourceName: "Synthetic patent filing data",
    extractionMethod: "demo-synthetic",
    notes: [
      "Quarterly AI-related patent filings by major banks (synthetic).",
      "Useful for trend/line chart demonstration.",
    ],
    columns: [
      { key: "quarter", label: "Quarter", type: "string" },
      { key: "jpmorgan", label: "JPMorgan", type: "number" },
      { key: "goldman", label: "Goldman Sachs", type: "number" },
      { key: "citi", label: "Citigroup", type: "number" },
    ],
    rows: [
      { id: rid(), values: { quarter: "Q1 2023", jpmorgan: 12, goldman: 8, citi: 6 } },
      { id: rid(), values: { quarter: "Q2 2023", jpmorgan: 15, goldman: 10, citi: 7 } },
      { id: rid(), values: { quarter: "Q3 2023", jpmorgan: 18, goldman: 11, citi: 9 } },
      { id: rid(), values: { quarter: "Q4 2023", jpmorgan: 22, goldman: 14, citi: 10 } },
      { id: rid(), values: { quarter: "Q1 2024", jpmorgan: 25, goldman: 16, citi: 12 } },
      { id: rid(), values: { quarter: "Q2 2024", jpmorgan: 28, goldman: 19, citi: 14 } },
    ],
  }),
];

export function getSampleDataset(id: string): ExtractedDataset | undefined {
  return sampleDatasets.find((d) => d.id === id);
}
