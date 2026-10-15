/**
 * DevVoid brand model - every theme is 4 colors.
 *
 * Source of truth per theme:
 *   background, foreground, primary, accent
 *
 * Every other colour is derived in index.css and tailwind.config.js: the
 * primary and accent tints (soft fills behind selected and active things),
 * surfaces, fields, borders, muted text and shadows. Older themes carrying
 * primaryLight/accentLight still load; those two fields are ignored.
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
}

export type ThemeTokenKey = keyof ThemeTokens;
