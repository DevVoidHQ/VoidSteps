/**
 * DevVoid brand model — every theme is 6 colors.
 *
 * Source of truth per theme:
 *   background, foreground, primary, accent, primaryLight, accentLight
 *
 * All other UI tokens (card, popover, muted, border, destructive, secondary,
 * ring, input) are derived from these 6 at the Tailwind layer.
 * Foreground colors for primary/accent (text-on-brand) are auto-computed
 * from luminance in applyTheme.
 *
 * Values are stored as HSL strings without the `hsl()` wrapper,
 * e.g. "222 90% 30%". This lets Tailwind compose alpha via
 * `hsl(var(--primary) / 0.12)`.
 */
export interface ThemeTokens {
  background: string;
  foreground: string;
  primary: string;
  accent: string;
  primaryLight: string;
  accentLight: string;
}

export type ThemeTokenKey = keyof ThemeTokens;
