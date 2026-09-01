import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOCUS_BACKGROUND,
  FOCUS_BACKGROUNDS,
  FOCUS_IMAGE_SCRIM,
  focusBackgroundCss,
} from "./focus-background";
import { SNAPSHOT_TABLES } from "./snapshot";

/** The six theme variables, and the only colours anything here may reference. */
const THEME_VARS = [
  "--background",
  "--foreground",
  "--primary",
  "--accent",
  "--primary-light",
  "--accent-light",
];

/** Anything that names a colour directly instead of deriving it from the theme. */
const HARDCODED_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla\(|\b(black|white|gray|grey|silver|red|blue|green)\b/;

describe("focus backgrounds", () => {
  it("never hardcodes a colour", () => {
    // The bug class this guards: a component that ignores the active theme
    // because someone inlined a grey. Every preset must compose theme vars.
    for (const bg of FOCUS_BACKGROUNDS) {
      expect(bg.css, `${bg.id} hardcodes a colour`).not.toMatch(HARDCODED_COLOUR);
    }
    expect(FOCUS_IMAGE_SCRIM).not.toMatch(HARDCODED_COLOUR);
  });

  it("references only the six theme variables", () => {
    const used = new Set<string>();
    for (const bg of FOCUS_BACKGROUNDS) {
      for (const m of bg.css.matchAll(/var\((--[a-z-]+)\)/g)) used.add(m[1]);
    }
    for (const v of used) expect(THEME_VARS).toContain(v);
  });

  it("never uses an absolute length", () => {
    // The scale-invariance rule. A preset must render the same in a 48px
    // settings swatch and a fullscreen view, so every size and position is a
    // percentage or an angle. Orbit shipped with `circle 38rem` and looked
    // like a different preset in the grid than in the preview, because a
    // 608px circle floods a small tile and merely tints a large one.
    const ABSOLUTE = /\b\d*\.?\d+(px|rem|em|pt|cm|mm|in|vh|vw|vmin|vmax|ch|ex)\b/;
    for (const bg of FOCUS_BACKGROUNDS) {
      expect(bg.css, `${bg.id} uses an absolute length`).not.toMatch(ABSOLUTE);
    }
  });

  it("offers enough variety to be worth a picker", () => {
    expect(FOCUS_BACKGROUNDS.length).toBeGreaterThanOrEqual(8);
    // Distinct css, or two entries are the same preset under two names.
    const css = FOCUS_BACKGROUNDS.map((b) => b.css);
    expect(new Set(css).size).toBe(css.length);
    const labels = FOCUS_BACKGROUNDS.map((b) => b.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps a flat option that adds nothing", () => {
    expect(FOCUS_BACKGROUNDS.find((b) => b.id === "plain")?.css).toBe("none");
  });

  it("has a resolvable default", () => {
    expect(FOCUS_BACKGROUNDS.map((b) => b.id)).toContain(DEFAULT_FOCUS_BACKGROUND);
  });

  it("falls back rather than emitting invalid css for an unknown id", () => {
    expect(focusBackgroundCss("nonsense")).toBe(FOCUS_BACKGROUNDS[0].css);
    // "custom" is handled by the view, which swaps in the user's image.
    expect(focusBackgroundCss("custom")).toBe(FOCUS_BACKGROUNDS[0].css);
  });

  it("uses ids, not css, as the stored value", () => {
    // Presets must be retunable without migrating anyone's setting.
    for (const bg of FOCUS_BACKGROUNDS) expect(bg.id).not.toContain("gradient");
  });
});

describe("focus media and backups", () => {
  it("stays out of the snapshot format", () => {
    // Wallpapers and audio are megabytes of cosmetic, re-pickable data. If
    // focusMedia ever joins SNAPSHOT_TABLES, every backup grows by the size
    // of someone's music. Deleting this test is not the fix.
    expect(SNAPSHOT_TABLES).not.toContain("focusMedia");
  });
});
