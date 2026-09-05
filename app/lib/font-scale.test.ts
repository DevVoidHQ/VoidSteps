import { describe, it, expect, beforeEach } from "vitest";
import {
  getFontScale,
  setFontScale,
  stepFontScale,
  applyFontScale,
  FONT_SCALE_PX,
  FONT_SCALE_ORDER,
} from "./preferences";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty("--app-font-size");
});

describe("font scale", () => {
  it('defaults to "default" with nothing stored', () => {
    expect(getFontScale()).toBe("default");
  });

  it('falls back to "default" on a junk stored value', () => {
    localStorage.setItem("voidsteps-font-scale", "enormous");
    expect(getFontScale()).toBe("default");
  });

  it("round-trips every scale", () => {
    for (const scale of FONT_SCALE_ORDER) {
      setFontScale(scale);
      expect(getFontScale()).toBe(scale);
    }
  });

  it("writes the css variable in px", () => {
    setFontScale("large");
    expect(document.documentElement.style.getPropertyValue("--app-font-size")).toBe("18px");
  });

  it("applyFontScale reflects what is stored", () => {
    localStorage.setItem("voidsteps-font-scale", "small");
    applyFontScale();
    expect(document.documentElement.style.getPropertyValue("--app-font-size")).toBe("14px");
  });

  it("steps up and down", () => {
    setFontScale("default");
    expect(stepFontScale(1)).toBe("large");
    expect(stepFontScale(-1)).toBe("default");
  });

  it("clamps at both ends instead of wrapping", () => {
    setFontScale(FONT_SCALE_ORDER[0]);
    expect(stepFontScale(-1)).toBe(FONT_SCALE_ORDER[0]);
    setFontScale(FONT_SCALE_ORDER[FONT_SCALE_ORDER.length - 1]);
    expect(stepFontScale(1)).toBe(FONT_SCALE_ORDER[FONT_SCALE_ORDER.length - 1]);
  });

  it("sizes increase monotonically across the order", () => {
    const px = FONT_SCALE_ORDER.map((s) => FONT_SCALE_PX[s]);
    expect(px).toEqual([...px].sort((a, b) => a - b));
    expect(new Set(px).size).toBe(px.length);
  });
});
