/**
 * Prompt users copy into their favorite AI (ChatGPT, Claude, etc.) to design a
 * VoidSteps theme. The AI returns JSON that can be pasted back and applied.
 * Keep the schema here in sync with `ThemeTokens` in theme-types.ts.
 */
export const THEME_AI_PROMPT = `You are designing a color theme for VoidSteps, a minimal offline-first goal tracker.

A theme is exactly 6 colors. Reply with ONLY a JSON object using these keys, where every value is an HSL string in the format "H S% L%" (hue 0-360, no commas, no "hsl()" wrapper):

{
  "background": "H S% L%",
  "foreground": "H S% L%",
  "primary": "H S% L%",
  "accent": "H S% L%",
  "primaryLight": "H S% L%",
  "accentLight": "H S% L%"
}

What each color means:
- background: the app's main surface color.
- foreground: the main text color. MUST contrast strongly with background.
- primary: the main brand / button color. Must be readable on the background.
- accent: a complementary highlight color, distinct from primary.
- primaryLight: a very subtle tint of primary used for soft surfaces and hover states.
- accentLight: a very subtle tint of accent.

Rules:
- High contrast between background and foreground (one clearly light, one clearly dark).
- For a DARK theme: background lightness < 15%, foreground lightness > 85%, and primaryLight/accentLight lightness around 14-20%.
- For a LIGHT theme: background lightness > 92%, foreground lightness < 12%, and primaryLight/accentLight lightness around 94-96%.
- primary and accent should be vivid enough to stand out, but never hurt to read.
- Output the JSON object only. No explanation, no markdown code fences.

First, ask me one short question: what kind of theme do I want (the mood, colors, or inspiration)? Wait for my answer, then reply with only the JSON object for that theme.`;
