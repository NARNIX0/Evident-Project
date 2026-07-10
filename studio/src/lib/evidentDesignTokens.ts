/**
 * Design tokens for Evident Insights UI + chart exports.
 *
 * Chart palette from EVIDENT_DATAVIZ_STYLE_GUIDE.md (sampled from published charts).
 * App shell keeps navy/orange brand chrome; exported charts default to light editorial theme.
 */

export const EVIDENT_DNA = {
  colors: {
    navy: "#222A43",
    navyDeep: "#313953",
    navyDark: "#272727",
    orange: "#FF7129",
    orangeAlt: "#FF7029",
    white: "#FFFFFF",
    offWhite: "#FCFCFC",
    gray900: "#333333",
    gray700: "#555555",
    gray500: "#6B7280",
    gray400: "#8690B0",
    gray300: "#CCCED6",
    gray200: "#D1D5DB",
    gray100: "#E5E7EB",
    gray50: "#EEEEEE",
    blueAccent: "#7889BB",
    black: "#000000",
    // Published chart palette (style guide)
    chartPrimary: "#249bff",
    chartPale: "#c7e3ee",
    chartGold: "#fa9b05",
    chartOrange: "#ff7129",
    chartSky: "#b2ddff",
    chartMid: "#87c8ff",
    chartIce: "#c2e4ff",
    chartBright: "#4fb0ff",
    chartSteel: "#3183c3",
    chartDeepBlue: "#007ee6",
    chartNavy: "#01467f",
    chartRisk: "#653f3c",
    textPrimary: "#0b1f33",
    textSecondary: "#475569",
    textMuted: "#64748b",
    gridLight: "#e6eef5",
    axisLight: "#9db2c4",
  },
  radius: {
    sm: "12px",
    md: "16px",
    lg: "24px",
    pill: "9999px",
  },
  spacing: {
    xs: "8px",
    sm: "10px",
    md: "16px",
    lg: "20px",
    xl: "24px",
    "2xl": "32px",
  },
  fonts: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: '"GT Sectra", Georgia, "Times New Roman", serif',
  },
} as const;

/** Series order for Evident-style research charts (blues first, then accents). */
export const EVIDENT_BLUE_SERIES = [
  EVIDENT_DNA.colors.chartPrimary, // #249bff
  EVIDENT_DNA.colors.chartPale, // #c7e3ee
  EVIDENT_DNA.colors.chartMid, // #87c8ff
  EVIDENT_DNA.colors.chartBright, // #4fb0ff
  EVIDENT_DNA.colors.chartDeepBlue, // #007ee6
  EVIDENT_DNA.colors.chartNavy, // #01467f
  EVIDENT_DNA.colors.chartSky, // #b2ddff
  EVIDENT_DNA.colors.chartIce, // #c2e4ff
  EVIDENT_DNA.colors.chartSteel, // #3183c3
  // Warm accents when many series need contrast
  EVIDENT_DNA.colors.chartGold, // #fa9b05
  EVIDENT_DNA.colors.chartOrange, // #ff7129
  EVIDENT_DNA.colors.chartRisk, // #653f3c
];

/** Orange-led series with blue accents for multi-metric charts. */
export const EVIDENT_ORANGE_SERIES = [
  EVIDENT_DNA.colors.chartOrange, // #ff7129
  EVIDENT_DNA.colors.chartGold, // #fa9b05
  "#ff8f4d",
  "#e85d1c",
  EVIDENT_DNA.colors.chartPrimary, // #249bff — blue accent
  EVIDENT_DNA.colors.chartMid, // #87c8ff
  EVIDENT_DNA.colors.chartPale, // #c7e3ee
  EVIDENT_DNA.colors.chartNavy, // #01467f
  EVIDENT_DNA.colors.chartSteel, // #3183c3
  EVIDENT_DNA.colors.chartRisk, // #653f3c
];

/** @deprecated Prefer EVIDENT_BLUE_SERIES — kept as the default blue-led mix. */
export const EVIDENT_CHART_SERIES = EVIDENT_BLUE_SERIES;
