import { deriveContrast, hslToRgb, isDarkBackground, textOn } from "./contrast";
import type { ThemeTokens, ThemeTokenKey } from "./theme-types";

const TOKEN_TO_CSS_VAR: Record<ThemeTokenKey, string> = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  accent: "--accent",
};

// White or near-black against a brand colour, whichever reads better.
function onColor(hsl: string): string {
  const rgb = hslToRgb(hsl);
  return rgb ? textOn(rgb) : "0 0% 100%";
}

// Convert an "H S% L%" string to a #rrggbb hex (data-URI cursors need a literal).
function hslToHex(hsl: string): string {
  const rgb = hslToRgb(hsl);
  if (!rgb) return "#083291";
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}

// Mix two #rrggbb colours, `amount` of b into a. Close enough to --primary-tint
// for a 64px favicon tile.
function mixHex(a: string, b: string, amount: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) =>
    Math.round(ch(a, i) * (1 - amount) + ch(b, i) * amount)
      .toString(16)
      .padStart(2, "0")
  );
  return `#${out.join("")}`;
}

// Build a circular dot cursor data-URI from theme colors (hotspot centered).
function dotCursor(fillHex: string, ringHex: string, opacity: string, fallback: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'>` +
    `<circle cx='10' cy='10' r='6' fill='${fillHex}' fill-opacity='${opacity}' stroke='${ringHex}' stroke-width='1.5'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 10 10, ${fallback}`;
}

// Keep the branded cursor in sync with the active theme. The ring uses the
// brand color's contrast tone so the dot stays visible on any background.
function applyCursorVars(theme: ThemeTokens, target: HTMLElement): void {
  const primaryHex = hslToHex(theme.primary);
  const accentHex = hslToHex(theme.accent);
  const ringPrimary = hslToHex(onColor(theme.primary));
  const ringAccent = hslToHex(onColor(theme.accent));
  target.style.setProperty("--cursor-default", dotCursor(primaryHex, ringPrimary, "0.9", "auto"));
  target.style.setProperty("--cursor-pointer", dotCursor(accentHex, ringAccent, "1", "pointer"));
}

// Branded "VS" mark, same as the collapsed sidebar logo: primary tint tile,
// V in primary, S in accent. Rebuilt on each theme change so the favicon and
// tab theme-color track the active theme.
function applyFavicon(theme: ThemeTokens): void {
  if (typeof document === "undefined") return;
  const bgHex = mixHex(hslToHex(theme.background), hslToHex(theme.primary), 0.12);
  const primaryHex = hslToHex(theme.primary);
  const accentHex = hslToHex(theme.accent);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<rect width='64' height='64' rx='14' fill='${bgHex}'/>` +
    `<text x='32' y='45' text-anchor='middle' font-family='Geist,-apple-system,Segoe UI,Roboto,sans-serif' font-size='34' font-weight='700' letter-spacing='-1'>` +
    `<tspan fill='${primaryHex}'>V</tspan><tspan fill='${accentHex}'>S</tspan></text></svg>`;
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = href;

  const meta = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
  if (meta) meta.content = primaryHex;
}

export function applyTheme(
  theme: ThemeTokens,
  target: HTMLElement = document.documentElement
): void {
  for (const [key, cssVar] of Object.entries(TOKEN_TO_CSS_VAR)) {
    const value = theme[key as ThemeTokenKey];
    if (value) {
      target.style.setProperty(cssVar, value);
    }
  }
  // Derived values that keep every text pair at WCAG AA (lib/contrast.ts).
  const derived = deriveContrast(theme);
  if (derived) {
    target.style.setProperty("--primary-foreground", derived.primaryForeground);
    target.style.setProperty("--accent-foreground", derived.accentForeground);
    target.style.setProperty("--muted-alpha", String(derived.mutedAlpha));
    target.style.setProperty("--primary-tint-amount", `${derived.primaryTint}%`);
    target.style.setProperty("--accent-tint-amount", `${derived.accentTint}%`);
    target.style.setProperty("--accent-ink", derived.accentInk);
  }
  // Light or dark scheme, from the background. Surfaces and elevation in
  // index.css key off this: depth reads as shadow on light themes and as
  // lighter layers on dark ones, where a shadow on near-black disappears.
  const bgRgb = hslToRgb(theme.background);
  target.dataset.scheme = bgRgb && isDarkBackground(bgRgb) ? "dark" : "light";
  // Theme-aware branded cursor.
  applyCursorVars(theme, target);
  // Theme-aware "VS" favicon + tab color.
  applyFavicon(theme);
}

export function getThemeFromDOM(target: HTMLElement = document.documentElement): ThemeTokens {
  const style = getComputedStyle(target);
  const theme: Partial<ThemeTokens> = {};

  for (const [key, cssVar] of Object.entries(TOKEN_TO_CSS_VAR)) {
    theme[key as ThemeTokenKey] = style.getPropertyValue(cssVar).trim();
  }

  return theme as ThemeTokens;
}

export function themeToCss(theme: ThemeTokens, selector = ":root"): string {
  const vars = Object.entries(TOKEN_TO_CSS_VAR)
    .map(([key, cssVar]) => `  ${cssVar}: ${theme[key as ThemeTokenKey]};`)
    .join("\n");

  return `${selector} {\n${vars}\n}`;
}
