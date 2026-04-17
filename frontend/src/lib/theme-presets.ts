import type { ThemeTokens } from "./theme-types";

/**
 * Every theme is exactly 6 colors. See `theme-types.ts`.
 * Values are HSL strings without the `hsl()` wrapper.
 */

// DevVoid brand — default
export const devVoidTheme: ThemeTokens = {
  background: "44 10% 97%",
  foreground: "43 8% 10%",
  primary: "222 90% 30%",      // #083291
  accent: "348 42% 58%",       // #c26579
  primaryLight: "221 83% 95%", // #e8effc
  accentLight: "348 83% 95%",  // #fce8ed
};

// Minimal light — pure black/white + brand
export const lightTheme: ThemeTokens = {
  background: "0 0% 100%",
  foreground: "0 0% 4%",
  primary: "222 90% 30%",
  accent: "348 42% 58%",
  primaryLight: "221 83% 95%",
  accentLight: "348 83% 95%",
};

// Minimal dark — pure black/white + brand
export const darkTheme: ThemeTokens = {
  background: "0 0% 4%",
  foreground: "0 0% 96%",
  primary: "222 80% 65%",
  accent: "348 65% 70%",
  primaryLight: "222 40% 14%",
  accentLight: "348 40% 14%",
};

export const oceanTheme: ThemeTokens = {
  background: "200 30% 5%",
  foreground: "180 20% 95%",
  primary: "190 80% 55%",
  accent: "170 70% 50%",
  primaryLight: "190 40% 14%",
  accentLight: "170 35% 14%",
};

export const forestTheme: ThemeTokens = {
  background: "140 30% 5%",
  foreground: "120 20% 95%",
  primary: "150 60% 50%",
  accent: "80 50% 55%",
  primaryLight: "150 30% 14%",
  accentLight: "80 30% 14%",
};

export const sunsetTheme: ThemeTokens = {
  background: "20 30% 5%",
  foreground: "30 20% 95%",
  primary: "25 90% 60%",
  accent: "340 80% 60%",
  primaryLight: "25 45% 14%",
  accentLight: "340 45% 14%",
};

export const midnightPurpleTheme: ThemeTokens = {
  background: "250 40% 8%",
  foreground: "250 20% 95%",
  primary: "270 80% 70%",
  accent: "310 70% 65%",
  primaryLight: "270 40% 16%",
  accentLight: "310 40% 16%",
};

export const cyberpunkTheme: ThemeTokens = {
  background: "300 15% 8%",
  foreground: "180 100% 90%",
  primary: "320 100% 65%",
  accent: "180 100% 50%",
  primaryLight: "320 50% 16%",
  accentLight: "180 50% 14%",
};

export const nordTheme: ThemeTokens = {
  background: "220 16% 22%",
  foreground: "218 27% 94%",
  primary: "193 43% 67%",
  accent: "179 25% 65%",
  primaryLight: "193 25% 28%",
  accentLight: "179 20% 28%",
};

export const draculaTheme: ThemeTokens = {
  background: "231 15% 18%",
  foreground: "60 30% 96%",
  primary: "326 100% 74%",
  accent: "191 97% 77%",
  primaryLight: "326 40% 25%",
  accentLight: "191 40% 25%",
};

export const monokaiTheme: ThemeTokens = {
  background: "70 8% 15%",
  foreground: "60 36% 96%",
  primary: "186 100% 69%",
  accent: "340 100% 68%",
  primaryLight: "186 40% 22%",
  accentLight: "340 40% 22%",
};

export const gruvboxTheme: ThemeTokens = {
  background: "34 25% 20%",
  foreground: "43 19% 88%",
  primary: "39 67% 69%",
  accent: "24 58% 62%",
  primaryLight: "39 35% 28%",
  accentLight: "24 35% 28%",
};

export const tokyoNightTheme: ThemeTokens = {
  background: "235 18% 12%",
  foreground: "224 13% 87%",
  primary: "217 92% 76%",
  accent: "267 84% 81%",
  primaryLight: "217 35% 20%",
  accentLight: "267 35% 20%",
};

export const rosePineTheme: ThemeTokens = {
  background: "249 22% 12%",
  foreground: "245 50% 91%",
  primary: "2 55% 83%",
  accent: "35 88% 72%",
  primaryLight: "2 30% 22%",
  accentLight: "35 35% 22%",
};

export const solarizedDarkTheme: ThemeTokens = {
  background: "192 100% 3%",
  foreground: "44 87% 94%",
  primary: "175 59% 45%",
  accent: "205 69% 55%",
  primaryLight: "175 30% 14%",
  accentLight: "205 30% 14%",
};

export const catppuccinMochaTheme: ThemeTokens = {
  background: "240 21% 12%",
  foreground: "226 64% 88%",
  primary: "267 84% 81%",
  accent: "316 72% 86%",
  primaryLight: "267 35% 22%",
  accentLight: "316 35% 22%",
};

export const oneDarkTheme: ThemeTokens = {
  background: "220 13% 18%",
  foreground: "219 14% 76%",
  primary: "207 82% 66%",
  accent: "286 60% 67%",
  primaryLight: "207 35% 26%",
  accentLight: "286 30% 26%",
};

export const ayuDarkTheme: ThemeTokens = {
  background: "220 27% 10%",
  foreground: "40 14% 80%",
  primary: "35 100% 67%",
  accent: "200 50% 60%",
  primaryLight: "35 40% 18%",
  accentLight: "200 30% 18%",
};

export const kanagawaTheme: ThemeTokens = {
  background: "225 17% 14%",
  foreground: "39 14% 80%",
  primary: "252 56% 72%",
  accent: "35 76% 60%",
  primaryLight: "252 30% 22%",
  accentLight: "35 35% 22%",
};

export const evergreenTheme: ThemeTokens = {
  background: "150 12% 10%",
  foreground: "44 27% 85%",
  primary: "142 40% 58%",
  accent: "30 50% 60%",
  primaryLight: "142 25% 18%",
  accentLight: "30 30% 18%",
};

export const synthwaveTheme: ThemeTokens = {
  background: "270 40% 8%",
  foreground: "300 30% 92%",
  primary: "300 100% 72%",
  accent: "195 100% 60%",
  primaryLight: "300 40% 16%",
  accentLight: "195 40% 16%",
};

export const themePresets = {
  devvoid: devVoidTheme,
  light: lightTheme,
  dark: darkTheme,
  ocean: oceanTheme,
  forest: forestTheme,
  sunset: sunsetTheme,
  midnightPurple: midnightPurpleTheme,
  cyberpunk: cyberpunkTheme,
  nord: nordTheme,
  dracula: draculaTheme,
  monokai: monokaiTheme,
  gruvbox: gruvboxTheme,
  tokyoNight: tokyoNightTheme,
  rosePine: rosePineTheme,
  solarizedDark: solarizedDarkTheme,
  catppuccinMocha: catppuccinMochaTheme,
  oneDark: oneDarkTheme,
  ayuDark: ayuDarkTheme,
  kanagawa: kanagawaTheme,
  evergreen: evergreenTheme,
  synthwave: synthwaveTheme,
} as const;

export type ThemePresetName = keyof typeof themePresets;
