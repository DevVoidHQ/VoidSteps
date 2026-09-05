import type { ThemeTokens, ThemeTokenKey } from "./theme-types";

const TOKEN_TO_CSS_VAR: Record<ThemeTokenKey, string> = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  accent: "--accent",
  primaryLight: "--primary-light",
  accentLight: "--accent-light",
};

// Parse an "H S% L%" string and convert to sRGB in [0,1]. Returns null on a
// malformed string so callers can pick their own fallback.
function hslToRgb(hsl: string): { r: number; g: number; b: number } | null {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return null;

  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r: number, g: number, b: number;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const off = l - c / 2;
  return { r: r + off, g: g + off, b: b + off };
}

// Pick black or white text for a brand surface using WCAG relative luminance.
// HSL lightness alone isn't perceptual - rose at L=58% reads dark, yellow at
// L=58% reads bright. Convert to sRGB and compute Y for a correct choice.
function contrastForeground(hsl: string): string {
  const rgb = hslToRgb(hsl);
  if (!rgb) return "0 0% 100%";

  const toLinear = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const Y = 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);

  return Y > 0.5 ? "0 0% 10%" : "0 0% 100%";
}

// Convert an "H S% L%" string to a #rrggbb hex (data-URI cursors need a literal).
function hslToHex(hsl: string): string {
  const rgb = hslToRgb(hsl);
  if (!rgb) return "#083291";
  const to = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`;
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
  const ringPrimary = hslToHex(contrastForeground(theme.primary));
  const ringAccent = hslToHex(contrastForeground(theme.accent));
  target.style.setProperty("--cursor-default", dotCursor(primaryHex, ringPrimary, "0.9", "auto"));
  target.style.setProperty("--cursor-pointer", dotCursor(accentHex, ringAccent, "1", "pointer"));
}

// Branded "VS" mark, same as the collapsed sidebar logo: primary-light tile,
// V in primary, S in accent. Rebuilt on each theme change so the favicon and
// tab theme-color track the active theme.
function applyFavicon(theme: ThemeTokens): void {
  if (typeof document === "undefined") return;
  const bgHex = hslToHex(theme.primaryLight || theme.background);
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
  // Derived contrast colors for text on brand surfaces.
  target.style.setProperty("--primary-foreground", contrastForeground(theme.primary));
  target.style.setProperty("--accent-foreground", contrastForeground(theme.accent));
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
