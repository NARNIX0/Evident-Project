import type { ExtractedDataset } from "@/types";
import { parsePastedTable } from "@/lib/parseTable";

export function isMarkdownSeparator(line: string): boolean {
  return /^[|\-+\s:]+$/.test(line.trim());
}

export interface MarkdownTableBlock {
  title: string;
  markdown: string;
}

export function findSectionTitle(lines: string[], tableStartIndex: number): string {
  for (let i = tableStartIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line || line === "---") continue;
    if (/^Action Items:/i.test(line)) return "Action Items";
    const numbered = line.match(/^\d+\.\s+(.+)/);
    if (numbered) return numbered[1].trim();
    if (line.length < 80 && !line.includes("|")) return line.replace(/:$/, "");
  }
  return "Extracted Table";
}

export function extractMarkdownTableBlocks(text: string): MarkdownTableBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownTableBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.includes("|") && !isMarkdownSeparator(trimmed)) {
      const tableLines: string[] = [];
      const start = i;

      while (i < lines.length) {
        const t = lines[i].trim();
        if (t.includes("|") || isMarkdownSeparator(t)) {
          if (!isMarkdownSeparator(t)) {
            tableLines.push(lines[i]);
          }
          i++;
        } else {
          break;
        }
      }

      if (tableLines.length >= 2) {
        blocks.push({
          title: findSectionTitle(lines, start),
          markdown: tableLines.join("\n"),
        });
      }
    } else {
      i++;
    }
  }

  return blocks;
}

export function extractActionItemsBlock(text: string): MarkdownTableBlock | null {
  const match = text.match(
    /Action Items:\s*\n([\s\S]*?)(?:\n\s*Notes prepared|\n\s*Distribution:|$)/i
  );
  if (!match) return null;

  const bullets = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"));

  if (bullets.length < 1) return null;

  const markdown = [
    "| Action Item |",
    "|-------------|",
    ...bullets.map((b) => `| ${b.replace(/^-\s*/, "").trim()} |`),
  ].join("\n");

  return { title: "Action Items", markdown };
}

export function isWeakTableDataset(
  dataset: ExtractedDataset,
  sourceText: string
): boolean {
  if (dataset.columns.length !== 1) {
    return false;
  }

  const sourceLines = sourceText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;

  if (dataset.rows.length >= 4 && sourceLines > dataset.rows.length * 0.4) {
    return true;
  }

  const longProseRows = dataset.rows.filter((row) => {
    const value = String(Object.values(row.values)[0] ?? "");
    return value.length > 60;
  });

  return longProseRows.length >= 3;
}

export function parseMarkdownBlocksToDatasets(
  blocks: MarkdownTableBlock[],
  baseName: string
): ExtractedDataset[] {
  const datasets: ExtractedDataset[] = [];

  for (const [index, block] of blocks.entries()) {
    try {
      const parsed = parsePastedTable(block.markdown, `${baseName} — ${block.title}`);
      datasets.push({
        ...parsed,
        name: `${baseName} — ${block.title}`,
        tableIndex: index,
        tableCategory: block.title,
      });
    } catch {
      // Skip blocks that fail to parse.
    }
  }

  return datasets;
}

export function extractTablesFromDocumentText(
  text: string,
  baseName: string
): ExtractedDataset[] {
  const markdownBlocks = extractMarkdownTableBlocks(text);
  const actionBlock = extractActionItemsBlock(text);
  const allBlocks = actionBlock
    ? [...markdownBlocks, actionBlock]
    : markdownBlocks;

  return parseMarkdownBlocksToDatasets(allBlocks, baseName);
}

/** True when at least one dataset has real multi-column tabular data (not action-item pseudo-tables). */
export function hasSubstantiveMarkdownTables(
  datasets: ExtractedDataset[]
): boolean {
  return datasets.some(
    (dataset) => dataset.columns.length >= 2 && dataset.rows.length >= 2
  );
}
