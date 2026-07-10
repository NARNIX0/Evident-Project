import { describe, it, expect } from "vitest";
import { formatAxisValue } from "../chartFormatting";

describe("formatAxisValue", () => {
  it("formats millions", () => {
    expect(formatAxisValue(3250000)).toBe("3.3M");
  });

  it("formats thousands", () => {
    expect(formatAxisValue(4200)).toBe("4.2K");
  });

  it("formats small numbers as-is", () => {
    expect(formatAxisValue(82)).toBe("82");
  });
});
