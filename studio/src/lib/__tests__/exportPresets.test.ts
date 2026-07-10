import { describe, it, expect } from "vitest";
import {
  EXPORT_PRESETS,
  getExportPreset,
  makeExportPresetId,
  parseExportPresetId,
  sanitizeExportFilename,
} from "../exportPresets";

describe("exportPresets", () => {
  it("exposes light/dark × blue/orange (no redundant minimal)", () => {
    expect(EXPORT_PRESETS.map((preset) => preset.id)).toEqual([
      "light-blue",
      "light-orange",
      "dark-blue",
      "dark-orange",
    ]);
  });

  it("defaults light + blue to a white chart background", () => {
    const preset = getExportPreset("light-blue");
    expect(preset.chart.background.toLowerCase()).toBe("#ffffff");
    expect(preset.chart.seriesColors[0].toLowerCase()).toBe("#249bff");
  });

  it("uses orange-led series for orange palette", () => {
    const preset = getExportPreset("light-orange");
    expect(preset.chart.seriesColors[0].toLowerCase()).toBe("#ff7129");
    expect(preset.chart.accentColor.toLowerCase()).toBe("#ff7129");
  });

  it("keeps dark navy as an optional theme", () => {
    expect(getExportPreset("dark-blue").chart.background).toBe("#222A43");
    expect(getExportPreset("dark-orange").chart.seriesColors[0].toLowerCase()).toBe(
      "#ff7129"
    );
  });

  it("maps legacy preset ids to the new combinations", () => {
    expect(parseExportPresetId("evident")).toEqual({
      theme: "light",
      palette: "blue",
    });
    expect(parseExportPresetId("evident-dark")).toEqual({
      theme: "dark",
      palette: "blue",
    });
    expect(parseExportPresetId("minimal")).toEqual({
      theme: "light",
      palette: "blue",
    });
    expect(makeExportPresetId("dark", "orange")).toBe("dark-orange");
  });
});

describe("sanitizeExportFilename", () => {
  it("creates safe filenames", () => {
    expect(sanitizeExportFilename("Total Bookings by City", "pptx")).toBe(
      "Total_Bookings_by_City.pptx"
    );
  });
});
