import type {
  ChartTheme,
  ExportPaletteId,
  ExportPreset,
  ExportPresetId,
  ExportThemeId,
  SlideTheme,
} from "@/types";
import {
  EVIDENT_BLUE_SERIES,
  EVIDENT_DNA,
  EVIDENT_ORANGE_SERIES,
} from "@/lib/evidentDesignTokens";

const { colors } = EVIDENT_DNA;

export const EXPORT_THEME_OPTIONS: {
  id: ExportThemeId;
  label: string;
}[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export const EXPORT_PALETTE_OPTIONS: {
  id: ExportPaletteId;
  label: string;
  swatches: string[];
}[] = [
  {
    id: "blue",
    label: "Blue",
    swatches: EVIDENT_BLUE_SERIES.slice(0, 4),
  },
  {
    id: "orange",
    label: "Orange",
    swatches: EVIDENT_ORANGE_SERIES.slice(0, 4),
  },
];

function seriesForPalette(palette: ExportPaletteId): string[] {
  return palette === "orange" ? EVIDENT_ORANGE_SERIES : EVIDENT_BLUE_SERIES;
}

function accentForPalette(palette: ExportPaletteId): string {
  return palette === "orange" ? colors.chartOrange : colors.chartPrimary;
}

function lightChart(palette: ExportPaletteId): ChartTheme {
  const accent = accentForPalette(palette);
  return {
    background: colors.white,
    titleColor: colors.textPrimary,
    seriesColors: seriesForPalette(palette),
    gridColor: colors.gridLight,
    axisColor: colors.axisLight,
    tooltipBackground: colors.white,
    tooltipBorder: colors.gridLight,
    tooltipText: colors.textPrimary,
    accentColor: accent,
  };
}

function darkChart(palette: ExportPaletteId): ChartTheme {
  const accent = accentForPalette(palette);
  return {
    background: colors.navy,
    titleColor: colors.white,
    seriesColors: seriesForPalette(palette),
    gridColor: colors.navyDeep,
    axisColor: colors.gray400,
    tooltipBackground: colors.navyDeep,
    tooltipBorder: accent,
    tooltipText: colors.white,
    accentColor: accent,
  };
}

function lightSlide(palette: ExportPaletteId): SlideTheme {
  const accent = accentForPalette(palette).replace("#", "");
  return {
    background: colors.white.replace("#", ""),
    titleColor: colors.textPrimary.replace("#", ""),
    bodyColor: colors.textSecondary.replace("#", ""),
    mutedColor: colors.textMuted.replace("#", ""),
    accentColor: accent,
    sourceColor: colors.textMuted.replace("#", ""),
  };
}

function darkSlide(palette: ExportPaletteId): SlideTheme {
  const accent = accentForPalette(palette).replace("#", "");
  return {
    background: colors.navy.replace("#", ""),
    titleColor: colors.white.replace("#", ""),
    bodyColor: colors.gray300.replace("#", ""),
    mutedColor: colors.gray400.replace("#", ""),
    accentColor: accent,
    sourceColor: colors.gray400.replace("#", ""),
  };
}

function buildPreset(
  theme: ExportThemeId,
  palette: ExportPaletteId
): ExportPreset {
  const id: ExportPresetId = `${theme}-${palette}`;
  const isLight = theme === "light";
  const paletteLabel = palette === "blue" ? "Blue" : "Orange";
  return {
    id,
    theme,
    palette,
    label: `${isLight ? "Light" : "Dark"} · ${paletteLabel}`,
    description: isLight
      ? `White research-note export with a ${palette}-led series palette.`
      : `Navy deck export with a ${palette}-led series palette.`,
    chart: isLight ? lightChart(palette) : darkChart(palette),
    slide: isLight ? lightSlide(palette) : darkSlide(palette),
  };
}

/** All theme × palette combinations (Minimal removed — it matched Light). */
export const EXPORT_PRESETS: ExportPreset[] = (
  ["light", "dark"] as ExportThemeId[]
).flatMap((theme) =>
  (["blue", "orange"] as ExportPaletteId[]).map((palette) =>
    buildPreset(theme, palette)
  )
);

export function makeExportPresetId(
  theme: ExportThemeId,
  palette: ExportPaletteId
): ExportPresetId {
  return `${theme}-${palette}`;
}

export function parseExportPresetId(id: string): {
  theme: ExportThemeId;
  palette: ExportPaletteId;
} {
  if (id === "evident" || id === "minimal") {
    return { theme: "light", palette: "blue" };
  }
  if (id === "evident-dark") {
    return { theme: "dark", palette: "blue" };
  }
  const [theme, palette] = id.split("-") as [ExportThemeId, ExportPaletteId];
  if (
    (theme === "light" || theme === "dark") &&
    (palette === "blue" || palette === "orange")
  ) {
    return { theme, palette };
  }
  return { theme: "light", palette: "blue" };
}

export function getExportPreset(id: ExportPresetId | string): ExportPreset {
  const { theme, palette } = parseExportPresetId(id);
  const match = EXPORT_PRESETS.find(
    (item) => item.theme === theme && item.palette === palette
  );
  return match ?? EXPORT_PRESETS[0];
}

export function sanitizeExportFilename(title: string, extension: string): string {
  const base = title.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  return `${base || "evident_chart"}.${extension}`;
}
