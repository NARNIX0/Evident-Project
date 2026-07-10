import type { ValidateOutput } from "./schemas";

const ATTENDEE_CATEGORY = /attendee|participant/i;
const ATTENDEE_NAME = /attendee|participant|who attended|meeting roster/i;
const ACTION_COLUMN = /owner|task|due|deadline|action|status|assignee|deliverable/i;

export interface RelevanceVerdict {
  block: boolean;
  reason: string;
}

export function assessTableRelevance(table: {
  name: string;
  category: string;
  columns: { key: string; label: string; type: string }[];
  rows: { values: Record<string, string | number | null> }[];
}): RelevanceVerdict {
  if (ATTENDEE_CATEGORY.test(table.category)) {
    return {
      block: true,
      reason:
        "Attendee/participant rosters are meeting metadata, not chart-ready research data.",
    };
  }

  if (ATTENDEE_NAME.test(table.name)) {
    return {
      block: true,
      reason: "Table name indicates a participant list — excluded from extraction.",
    };
  }

  const labels = table.columns.map((c) => c.label.toLowerCase());
  const allString = table.columns.every(
    (c) => c.type === "string" || c.type === "date"
  );
  const hasNumeric = table.columns.some((c) =>
    ["number", "percentage", "currency"].includes(c.type)
  );

  const isNameRoleRoster =
    table.columns.length <= 3 &&
    labels.some((l) => /\bname\b/.test(l)) &&
    labels.some((l) => /\brole\b/.test(l)) &&
    allString;

  if (isNameRoleRoster) {
    return {
      block: true,
      reason: "Name/role rosters are not useful for financial research charts.",
    };
  }

  const hasActionStructure = labels.some((l) => ACTION_COLUMN.test(l));
  if (allString && !hasNumeric && !hasActionStructure && table.rows.length <= 12) {
    return {
      block: true,
      reason:
        "All-text table with no metrics or action-item structure — low research value.",
    };
  }

  return { block: false, reason: "" };
}

export function applyRelevanceBlocks(
  output: ValidateOutput
): ValidateOutput {
  return {
    ...output,
    tables: output.tables.map((table) => {
      const verdict = assessTableRelevance(table);
      if (!verdict.block) return table;

      return {
        ...table,
        keep: false,
        chartable: false,
        qualityScore: Math.min(table.qualityScore, 0.2),
        issues: [...new Set([...table.issues, verdict.reason])],
      };
    }),
  };
}

export function mergeCuratorDecisions(
  validated: ValidateOutput,
  curator: {
    tables: {
      name: string;
      keep: boolean;
      relevanceScore: number;
      rationale: string;
    }[];
  }
): ValidateOutput {
  const decisionByName = new Map(
    curator.tables.map((d) => [d.name.toLowerCase(), d] as const)
  );

  return {
    ...validated,
    tables: validated.tables.map((table) => {
      const decision = decisionByName.get(table.name.toLowerCase());
      if (!decision) return table;

      const issues = [...table.issues];
      if (!decision.keep) {
        issues.push(`Curator: ${decision.rationale}`);
      }

      return {
        ...table,
        keep: table.keep && decision.keep,
        chartable: table.chartable && decision.keep,
        qualityScore: decision.keep
          ? Math.max(table.qualityScore, decision.relevanceScore * 0.5)
          : Math.min(table.qualityScore, 0.25),
        issues: [...new Set(issues)],
      };
    }),
  };
}
