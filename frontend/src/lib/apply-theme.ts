import type { ThemeTokens, ThemeTokenKey } from "./theme-types";

const TOKEN_TO_CSS_VAR: Record<ThemeTokenKey, string> = {
  background: "--background",
  foreground: "--foreground",
  primary: "--primary",
  accent: "--accent",
  primaryLight: "--primary-light",
  accentLight: "--accent-light",
};

// Pick black or white text for a brand surface based on HSL lightness.
function contrastForeground(hsl: string): string {
  const match = hsl.trim().match(/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return "0 0% 100%";
  const l = parseFloat(match[1]);
  return l > 55 ? "0 0% 8%" : "0 0% 100%";
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
