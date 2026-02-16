import type { ThemeTokens, ThemeTokenKey } from "./theme-types";

const TOKEN_TO_CSS_VAR: Record<ThemeTokenKey, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
};

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
