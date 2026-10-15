import type { ThemeTokens } from "./theme-types";

/**
 * Every theme is exactly 4 colors. See `theme-types.ts`.
 * Values are HSL strings without the `hsl()` wrapper.
 */

// DevVoid brand - default
const devVoidTheme: ThemeTokens = {
  background: "44 10% 97%",
  foreground: "43 8% 10%",
  primary: "222 90% 30%", // #083291
  accent: "348 42% 58%", // #c26579
};

// Minimal dark - pure black/white + brand
const darkTheme: ThemeTokens = {
  background: "0 0% 4%",
  foreground: "0 0% 96%",
  primary: "222 80% 65%",
  accent: "348 65% 70%",
};

const oceanTheme: ThemeTokens = {
  background: "200 30% 5%",
  foreground: "180 20% 95%",
  primary: "190 80% 55%",
  accent: "170 70% 50%",
};

const forestTheme: ThemeTokens = {
  background: "140 30% 5%",
  foreground: "120 20% 95%",
  primary: "150 60% 50%",
  accent: "80 50% 55%",
};

const sunsetTheme: ThemeTokens = {
  background: "20 30% 5%",
  foreground: "30 20% 95%",
  primary: "25 90% 60%",
  accent: "340 80% 60%",
};

const midnightPurpleTheme: ThemeTokens = {
  background: "250 40% 8%",
  foreground: "250 20% 95%",
  primary: "270 80% 70%",
  accent: "310 70% 65%",
};

const cyberpunkTheme: ThemeTokens = {
  background: "300 15% 8%",
  foreground: "180 100% 90%",
  primary: "320 100% 65%",
  accent: "180 100% 50%",
};

const nordTheme: ThemeTokens = {
  background: "220 16% 22%",
  foreground: "218 27% 94%",
  primary: "193 43% 67%",
  accent: "179 25% 65%",
};

const draculaTheme: ThemeTokens = {
  background: "231 15% 18%",
  foreground: "60 30% 96%",
  primary: "326 100% 74%",
  accent: "191 97% 77%",
};

const monokaiTheme: ThemeTokens = {
  background: "70 8% 15%",
  foreground: "60 36% 96%",
  primary: "186 100% 69%",
  accent: "340 100% 68%",
};

const gruvboxTheme: ThemeTokens = {
  background: "34 25% 20%",
  foreground: "43 19% 88%",
  primary: "39 67% 69%",
  accent: "24 58% 62%",
};

const tokyoNightTheme: ThemeTokens = {
  background: "235 18% 12%",
  foreground: "224 13% 87%",
  primary: "217 92% 76%",
  accent: "267 84% 81%",
};

const rosePineTheme: ThemeTokens = {
  background: "249 22% 12%",
  foreground: "245 50% 91%",
  primary: "2 55% 83%",
  accent: "35 88% 72%",
};

const solarizedDarkTheme: ThemeTokens = {
  background: "192 100% 3%",
  foreground: "44 87% 94%",
  primary: "175 59% 45%",
  accent: "205 69% 55%",
};

const catppuccinMochaTheme: ThemeTokens = {
  background: "240 21% 12%",
  foreground: "226 64% 88%",
  primary: "267 84% 81%",
  accent: "316 72% 86%",
};

const oneDarkTheme: ThemeTokens = {
  background: "220 13% 18%",
  foreground: "219 14% 76%",
  primary: "207 82% 66%",
  accent: "286 60% 67%",
};

const ayuDarkTheme: ThemeTokens = {
  background: "220 27% 10%",
  foreground: "40 14% 80%",
  primary: "35 100% 67%",
  accent: "200 50% 60%",
};

const kanagawaTheme: ThemeTokens = {
  background: "225 17% 14%",
  foreground: "39 14% 80%",
  primary: "252 56% 72%",
  accent: "35 76% 60%",
};

const evergreenTheme: ThemeTokens = {
  background: "150 12% 10%",
  foreground: "44 27% 85%",
  primary: "142 40% 58%",
  accent: "30 50% 60%",
};

const synthwaveTheme: ThemeTokens = {
  background: "270 40% 8%",
  foreground: "300 30% 92%",
  primary: "300 100% 72%",
  accent: "195 100% 60%",
};

export const themePresets = {
  devvoid: devVoidTheme,
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
