import type { DatasetColumn } from "@/types";

const PERCENT_TYPES = new Set(["percentage"]);
const ABSOLUTE_TYPES = new Set(["number", "currency"]);

export function maxNumericValue(
  data: Record<string, string | number | null>[],
  keys: string[]
): number {
  let max = 0;
  for (const row of data) {
    for (const key of keys) {
      const n = Number(row[key]);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

/**
 * Axis domain with headroom so bars and LabelList values are not clipped.
 * Recharts default can leave labels / overflow values flush against the edge.
 */
export function paddedDomain(
  data: Record<string, string | number | null>[],
  keys: string[],
  padRatio = 0.18
): [number, number] {
  const max = maxNumericValue(data, keys);
  if (max <= 0) return [0, 1];
  const padded = max * (1 + padRatio);
  // Nice-ish upper bound
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const nice = Math.ceil(padded / magnitude) * magnitude;
  return [0, nice];
}

export interface ScaleGroups {
  percentKeys: string[];
  absoluteKeys: string[];
  /** True when both % and absolute metrics are plotted together. */
  isMixed: boolean;
}

export function groupKeysByScale(
  keys: string[],
  columns: DatasetColumn[]
): ScaleGroups {
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const percentKeys: string[] = [];
  const absoluteKeys: string[] = [];

  for (const key of keys) {
    const col = byKey.get(key);
    if (col && PERCENT_TYPES.has(col.type)) {
      percentKeys.push(key);
    } else if (col && ABSOLUTE_TYPES.has(col.type)) {
      absoluteKeys.push(key);
    } else if (col && /%|percent|share|adoption|intent/i.test(col.label)) {
      percentKeys.push(key);
    } else {
      absoluteKeys.push(key);
    }
  }

  // Magnitude heuristic: if "absolute" keys are all ≤100 and labels look like %, treat as %
  return {
    percentKeys,
    absoluteKeys,
    isMixed: percentKeys.length > 0 && absoluteKeys.length > 0,
  };
}

/** Hover band that does not match any series fill (esp. gray300). */
export function chartHoverCursor(isDarkBackground: boolean): {
  fill: string;
  stroke?: string;
  strokeWidth?: number;
} {
  return isDarkBackground
    ? { fill: "rgba(255, 113, 41, 0.14)" } // translucent Evident orange
    : { fill: "rgba(34, 42, 67, 0.08)" }; // translucent navy
}
