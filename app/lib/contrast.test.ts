import { describe, expect, it } from "vitest";
import { contrastReport, deriveContrast, hslToRgb, textOn } from "./contrast";
import { themePresets } from "./theme-presets";

// Every preset, through the same derivation the app applies, must meet WCAG AA
// (4.5:1) for every text pair. A new or retuned preset that fails lands here.
describe.each(Object.entries(themePresets))("%s theme", (_name, theme) => {
  it("meets AA for every derived text pair", () => {
    const report = contrastReport(theme)!;
    for (const [pair, ratio] of Object.entries(report)) {
      expect({ pair, ratio: Math.round(ratio * 100) / 100 }).toEqual({
        pair,
        ratio: expect.toSatisfy((r: number) => r >= 4.5),
      });
    }
  });
});

it("puts dark text on a mid-bright fill", () => {
  // A light blue that the old 0.5 luminance cutoff gave white text.
  expect(textOn(hslToRgb("222 80% 65%")!)).toBe("0 0% 10%");
  expect(textOn(hslToRgb("222 90% 30%")!)).toBe("0 0% 100%");
});

it("leaves a theme that already passes alone", () => {
  const d = deriveContrast({
    background: "0 0% 100%",
    foreground: "0 0% 0%",
    primary: "222 90% 30%",
    accent: "222 90% 30%",
  })!;
  expect(d.mutedAlpha).toBe(0.6);
  expect(d.accentInk).toBe("rgb(8 49 145)");
});
