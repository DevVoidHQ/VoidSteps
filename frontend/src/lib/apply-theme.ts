import type { ThemeTokens, ThemeTokenKey } from "./theme-types";

const TOKEN_TO_CSS_VAR: Record<ThemeTokenKey, string> = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  accent: "--accent",
  primaryLight: "--primary-light",
  accentLight: "--accent-light",
};

// Pick black or white text for a brand surface using WCAG relative luminance.
// HSL lightness alone isn't perceptual — rose at L=58% reads dark, yellow at
// L=58% reads bright. Convert to sRGB and compute Y for a correct choice.
function contrastForeground(hsl: string): string {
  const match = hsl
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return "0 0% 100%";

  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;

  // HSL -> linear sRGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  r += m; g += m; b += m;

  const toLinear = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const Y = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return Y > 0.5 ? "0 0% 10%" : "0 0% 100%";
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
}

export function getThemeFromDOM(
  target: HTMLElement = document.documentElement
): ThemeTokens {
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
