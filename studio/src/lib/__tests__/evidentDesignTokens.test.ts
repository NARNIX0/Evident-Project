import { describe, it, expect } from "vitest";
import {
  EVIDENT_DNA,
  EVIDENT_CHART_SERIES,
  EVIDENT_BLUE_SERIES,
  EVIDENT_ORANGE_SERIES,
} from "../evidentDesignTokens";

describe("evidentDesignTokens", () => {
  it("keeps navy/orange brand chrome for the app shell", () => {
    expect(EVIDENT_DNA.colors.navy).toBe("#222A43");
    expect(EVIDENT_DNA.colors.orange).toBe("#FF7129");
  });

  it("defines blue-led and orange-led chart series", () => {
    expect(EVIDENT_BLUE_SERIES[0]).toBe("#249bff");
    expect(EVIDENT_ORANGE_SERIES[0]).toBe("#ff7129");
    expect(EVIDENT_CHART_SERIES).toEqual(EVIDENT_BLUE_SERIES);
    expect(EVIDENT_BLUE_SERIES).toContain("#c7e3ee");
    expect(EVIDENT_ORANGE_SERIES).toContain("#fa9b05");
    expect(EVIDENT_ORANGE_SERIES).toContain("#249bff");
  });
});
