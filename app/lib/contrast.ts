import type { ThemeTokens } from "./theme-types";

/**
 * WCAG contrast for the 4-colour themes. A theme only names background,
 * foreground, primary and accent; everything else is derived, and the
 * derived pairs are where contrast quietly fails. applyTheme() calls
 * deriveContrast() so every preset and every custom theme gets values that
 * pass AA (4.5:1 for text), not just the ones someone checked by hand.
 *
 * The surfaces here mirror the color-mix() formulas in index.css; keep the
 * two in step.
 */

export type RGB = [number, number, number];

const AA_TEXT = 4.5;
const WHITE: RGB = [1, 1, 1];
const NEAR_BLACK: RGB = [0.1, 0.1, 0.1];

/** "H S% L%" to sRGB in [0,1], or null for a malformed string. */
export function hslToRgb(hsl: string): RGB | null {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: RGB;
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const off = l - c / 2;
  return [rgb[0] + off, rgb[1] + off, rgb[2] + off];
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const fromLinear = (v: number) =>
  v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** WCAG relative luminance. */
export function luminance([r, g, b]: RGB): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toOklab([r, g, b]: RGB): RGB {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp(fromLinear(clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s))),
    clamp(fromLinear(clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s))),
    clamp(fromLinear(clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s))),
  ];
}

/** color-mix(in oklab, a, b `t`). */
export function mix(a: RGB, b: RGB, t: number): RGB {
  const [A, B] = [toOklab(a), toOklab(b)];
  return fromOklab([0, 1, 2].map((i) => A[i] * (1 - t) + B[i] * t) as RGB);
}

/** A colour at `alpha` composited over `bg`, as the browser paints it. */
function over(fg: RGB, alpha: number, bg: RGB): RGB {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as RGB;
}

const toCss = ([r, g, b]: RGB) =>
  `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;

export const isDarkBackground = (bg: RGB) => luminance(bg) < 0.2;

/** White or near-black text on a filled colour, whichever reads better. */
export function textOn(fill: RGB): "0 0% 100%" | "0 0% 10%" {
  return contrastRatio(WHITE, fill) >= contrastRatio(NEAR_BLACK, fill) ? "0 0% 100%" : "0 0% 10%";
}

/** Page, docked panel, card, popover and field fills, as index.css mixes them. */
function surfaces(bg: RGB, fg: RGB): RGB[] {
  return isDarkBackground(bg)
    ? [bg, mix(bg, fg, 0.04), mix(bg, fg, 0.07), mix(bg, fg, 0.1), mix(bg, fg, 0.09)]
    : [bg, mix(bg, fg, 0.05), mix(bg, WHITE, 0.92), WHITE, mix(bg, fg, 0.06)];
}

const worst = (text: RGB, fills: RGB[]) => Math.min(...fills.map((f) => contrastRatio(text, f)));

/**
 * The colour itself when it reads as text on every surface, else the nearest
 * shade that does: darker on light themes, lighter on dark ones, same hue.
 */
function ink(color: RGB, fills: RGB[], dark: boolean): RGB {
  if (worst(color, fills) >= AA_TEXT) return color;
  const lab = toOklab(color);
  for (let step = 1; step <= 60; step++) {
    const L = lab[0] + (dark ? step : -step) * 0.01;
    if (L < 0 || L > 1) break;
    const candidate = fromOklab([L, lab[1], lab[2]]);
    if (worst(candidate, fills) >= AA_TEXT) return candidate;
  }
  return dark ? WHITE : NEAR_BLACK;
}

/** The strongest tint (mix of `color` into the page) that `text` still reads on. */
function tintAmount(bg: RGB, color: RGB, text: RGB, start: number): number {
  for (let pct = Math.round(start * 100); pct > 4; pct--) {
    if (contrastRatio(text, mix(bg, color, pct / 100)) >= AA_TEXT) return pct;
  }
  return 4;
}

export interface DerivedContrast {
  primaryForeground: string;
  accentForeground: string;
  /** Opacity of the foreground used for muted text. */
  mutedAlpha: number;
  /** Percent of the colour mixed into the page for its soft tint. */
  primaryTint: number;
  accentTint: number;
  /** Accent as text: the accent, or the nearest shade that passes. */
  accentInk: string;
}

export function deriveContrast(theme: ThemeTokens): DerivedContrast | null {
  const [bg, fg, primary, accent] = [
    hslToRgb(theme.background),
    hslToRgb(theme.foreground),
    hslToRgb(theme.primary),
    hslToRgb(theme.accent),
  ];
  if (!bg || !fg || !primary || !accent) return null;
  const dark = isDarkBackground(bg);
  const fills = surfaces(bg, fg);

  let mutedAlpha = 0.6;
  while (mutedAlpha < 1 && fills.some((f) => contrastRatio(over(fg, mutedAlpha, f), f) < AA_TEXT))
    mutedAlpha = Math.round((mutedAlpha + 0.02) * 100) / 100;

  const accentInk = ink(accent, fills, dark);
  const defaultTint = dark ? 0.22 : 0.12;

  return {
    primaryForeground: textOn(primary),
    accentForeground: textOn(accent),
    mutedAlpha,
    primaryTint: tintAmount(bg, primary, primary, defaultTint),
    accentTint: tintAmount(bg, accent, accentInk, defaultTint),
    accentInk: toCss(accentInk),
  };
}

/** Every derived text pair for a theme, for tests and the theme editor. */
export function contrastReport(theme: ThemeTokens): Record<string, number> | null {
  const d = deriveContrast(theme);
  const [bg, fg, primary, accent] = [
    hslToRgb(theme.background),
    hslToRgb(theme.foreground),
    hslToRgb(theme.primary),
    hslToRgb(theme.accent),
  ];
  if (!d || !bg || !fg || !primary || !accent) return null;
  const fills = surfaces(bg, fg);
  const accentInk = d.accentInk.match(/\d+/g)!.map((n) => Number(n) / 255) as RGB;
  return {
    text: worst(fg, fills),
    muted: Math.min(...fills.map((f) => contrastRatio(over(fg, d.mutedAlpha, f), f))),
    onPrimary: contrastRatio(hslToRgb(d.primaryForeground)!, primary),
    onAccent: contrastRatio(hslToRgb(d.accentForeground)!, accent),
    primaryOnTint: contrastRatio(primary, mix(bg, primary, d.primaryTint / 100)),
    accentInkOnTint: contrastRatio(accentInk, mix(bg, accent, d.accentTint / 100)),
    accentInk: worst(accentInk, fills),
  };
}
