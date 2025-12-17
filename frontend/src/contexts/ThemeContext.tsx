import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export const DEFAULT_DARK_THEME: ThemeColors = {
  background: '0 0% 0%',
  foreground: '0 0% 97%',
  card: '0 0% 5%',
  cardForeground: '0 0% 97%',
  popover: '0 0% 5%',
  popoverForeground: '0 0% 97%',
  primary: '217 79% 71%',
  primaryForeground: '0 0% 0%',
  secondary: '217 100% 42%',
  secondaryForeground: '0 0% 97%',
  muted: '0 0% 15%',
  mutedForeground: '0 0% 60%',
  accent: '217 79% 71%',
  accentForeground: '0 0% 0%',
  destructive: '0 84% 60%',
  destructiveForeground: '0 0% 97%',
  border: '0 0% 15%',
  input: '0 0% 15%',
  ring: '217 79% 71%',
};

export const DEFAULT_LIGHT_THEME: ThemeColors = {
  background: '0 0% 100%',
  foreground: '0 0% 3%',
  card: '0 0% 100%',
  cardForeground: '0 0% 3%',
  popover: '0 0% 100%',
  popoverForeground: '0 0% 3%',
  primary: '217 79% 50%',
  primaryForeground: '0 0% 100%',
  secondary: '217 100% 30%',
  secondaryForeground: '0 0% 100%',
  muted: '0 0% 96%',
  mutedForeground: '0 0% 45%',
  accent: '217 79% 50%',
  accentForeground: '0 0% 100%',
  destructive: '0 84% 50%',
  destructiveForeground: '0 0% 100%',
  border: '0 0% 90%',
  input: '0 0% 90%',
  ring: '217 79% 50%',
};

export const PRESET_THEMES: Record<string, ThemeColors> = {
  dark: DEFAULT_DARK_THEME,
  light: DEFAULT_LIGHT_THEME,
  ocean: {
    background: '200 30% 5%',
    foreground: '180 20% 95%',
    card: '200 30% 8%',
    cardForeground: '180 20% 95%',
    popover: '200 30% 8%',
    popoverForeground: '180 20% 95%',
    primary: '190 80% 50%',
    primaryForeground: '200 30% 5%',
    secondary: '170 70% 40%',
    secondaryForeground: '180 20% 95%',
    muted: '200 20% 15%',
    mutedForeground: '180 15% 60%',
    accent: '190 80% 50%',
    accentForeground: '200 30% 5%',
    destructive: '0 84% 60%',
    destructiveForeground: '180 20% 95%',
    border: '200 20% 20%',
    input: '200 20% 20%',
    ring: '190 80% 50%',
  },
  forest: {
    background: '140 30% 5%',
    foreground: '120 20% 95%',
    card: '140 30% 8%',
    cardForeground: '120 20% 95%',
    popover: '140 30% 8%',
    popoverForeground: '120 20% 95%',
    primary: '150 60% 45%',
    primaryForeground: '140 30% 5%',
    secondary: '130 50% 35%',
    secondaryForeground: '120 20% 95%',
    muted: '140 20% 15%',
    mutedForeground: '120 15% 60%',
    accent: '150 60% 45%',
    accentForeground: '140 30% 5%',
    destructive: '0 84% 60%',
    destructiveForeground: '120 20% 95%',
    border: '140 20% 20%',
    input: '140 20% 20%',
    ring: '150 60% 45%',
  },
  sunset: {
    background: '20 30% 5%',
    foreground: '30 20% 95%',
    card: '20 30% 8%',
    cardForeground: '30 20% 95%',
    popover: '20 30% 8%',
    popoverForeground: '30 20% 95%',
    primary: '25 90% 55%',
    primaryForeground: '20 30% 5%',
    secondary: '340 80% 50%',
    secondaryForeground: '30 20% 95%',
    muted: '20 20% 15%',
    mutedForeground: '30 15% 60%',
    accent: '25 90% 55%',
    accentForeground: '20 30% 5%',
    destructive: '0 84% 60%',
    destructiveForeground: '30 20% 95%',
    border: '20 20% 20%',
    input: '20 20% 20%',
    ring: '25 90% 55%',
  },
  midnightPurple: {
    background: '250 40% 8%',
    foreground: '250 20% 95%',
    card: '250 35% 12%',
    cardForeground: '250 20% 95%',
    popover: '250 35% 12%',
    popoverForeground: '250 20% 95%',
    primary: '270 80% 65%',
    primaryForeground: '250 40% 8%',
    secondary: '280 70% 55%',
    secondaryForeground: '250 20% 95%',
    muted: '250 25% 18%',
    mutedForeground: '250 15% 65%',
    accent: '270 80% 65%',
    accentForeground: '250 40% 8%',
    destructive: '340 85% 60%',
    destructiveForeground: '250 20% 95%',
    border: '250 25% 22%',
    input: '250 25% 22%',
    ring: '270 80% 65%',
  },
  cyberpunk: {
    background: '300 15% 8%',
    foreground: '180 100% 90%',
    card: '300 18% 12%',
    cardForeground: '180 100% 90%',
    popover: '300 18% 12%',
    popoverForeground: '180 100% 90%',
    primary: '320 100% 65%',
    primaryForeground: '300 15% 8%',
    secondary: '180 100% 50%',
    secondaryForeground: '300 15% 8%',
    muted: '300 10% 18%',
    mutedForeground: '180 50% 70%',
    accent: '180 100% 50%',
    accentForeground: '300 15% 8%',
    destructive: '0 90% 60%',
    destructiveForeground: '180 100% 90%',
    border: '300 15% 25%',
    input: '300 15% 25%',
    ring: '320 100% 65%',
  },
  nord: {
    background: '220 16% 22%',
    foreground: '218 27% 94%',
    card: '220 17% 26%',
    cardForeground: '218 27% 94%',
    popover: '220 17% 26%',
    popoverForeground: '218 27% 94%',
    primary: '193 43% 67%',
    primaryForeground: '220 16% 22%',
    secondary: '179 25% 65%',
    secondaryForeground: '220 16% 22%',
    muted: '220 17% 32%',
    mutedForeground: '218 27% 75%',
    accent: '193 43% 67%',
    accentForeground: '220 16% 22%',
    destructive: '354 42% 56%',
    destructiveForeground: '218 27% 94%',
    border: '220 17% 38%',
    input: '220 17% 38%',
    ring: '193 43% 67%',
  },
  dracula: {
    background: '231 15% 18%',
    foreground: '60 30% 96%',
    card: '232 14% 22%',
    cardForeground: '60 30% 96%',
    popover: '232 14% 22%',
    popoverForeground: '60 30% 96%',
    primary: '326 100% 74%',
    primaryForeground: '231 15% 18%',
    secondary: '191 97% 77%',
    secondaryForeground: '231 15% 18%',
    muted: '232 14% 28%',
    mutedForeground: '60 30% 75%',
    accent: '265 89% 78%',
    accentForeground: '231 15% 18%',
    destructive: '0 100% 67%',
    destructiveForeground: '60 30% 96%',
    border: '232 14% 35%',
    input: '232 14% 35%',
    ring: '326 100% 74%',
  },
  monokai: {
    background: '70 8% 15%',
    foreground: '60 36% 96%',
    card: '70 10% 19%',
    cardForeground: '60 36% 96%',
    popover: '70 10% 19%',
    popoverForeground: '60 36% 96%',
    primary: '186 100% 69%',
    primaryForeground: '70 8% 15%',
    secondary: '81 100% 76%',
    secondaryForeground: '70 8% 15%',
    muted: '70 10% 25%',
    mutedForeground: '60 36% 75%',
    accent: '186 100% 69%',
    accentForeground: '70 8% 15%',
    destructive: '338 95% 56%',
    destructiveForeground: '60 36% 96%',
    border: '70 10% 32%',
    input: '70 10% 32%',
    ring: '186 100% 69%',
  },
  gruvbox: {
    background: '34 25% 20%',
    foreground: '43 19% 88%',
    card: '34 25% 25%',
    cardForeground: '43 19% 88%',
    popover: '34 25% 25%',
    popoverForeground: '43 19% 88%',
    primary: '39 67% 69%',
    primaryForeground: '34 25% 20%',
    secondary: '24 58% 62%',
    secondaryForeground: '34 25% 20%',
    muted: '34 20% 32%',
    mutedForeground: '43 19% 70%',
    accent: '142 46% 61%',
    accentForeground: '34 25% 20%',
    destructive: '4 69% 55%',
    destructiveForeground: '43 19% 88%',
    border: '34 20% 38%',
    input: '34 20% 38%',
    ring: '39 67% 69%',
  },
  tokyoNight: {
    background: '235 18% 12%',
    foreground: '224 13% 87%',
    card: '235 17% 16%',
    cardForeground: '224 13% 87%',
    popover: '235 17% 16%',
    popoverForeground: '224 13% 87%',
    primary: '217 92% 76%',
    primaryForeground: '235 18% 12%',
    secondary: '189 71% 73%',
    secondaryForeground: '235 18% 12%',
    muted: '235 15% 22%',
    mutedForeground: '224 13% 70%',
    accent: '267 84% 81%',
    accentForeground: '235 18% 12%',
    destructive: '0 90% 67%',
    destructiveForeground: '224 13% 87%',
    border: '235 15% 28%',
    input: '235 15% 28%',
    ring: '217 92% 76%',
  },
  rosePine: {
    background: '249 22% 12%',
    foreground: '245 50% 91%',
    card: '249 22% 16%',
    cardForeground: '245 50% 91%',
    popover: '249 22% 16%',
    popoverForeground: '245 50% 91%',
    primary: '2 55% 83%',
    primaryForeground: '249 22% 12%',
    secondary: '189 43% 73%',
    secondaryForeground: '249 22% 12%',
    muted: '249 15% 22%',
    mutedForeground: '245 22% 70%',
    accent: '35 88% 72%',
    accentForeground: '249 22% 12%',
    destructive: '343 76% 68%',
    destructiveForeground: '245 50% 91%',
    border: '249 15% 28%',
    input: '249 15% 28%',
    ring: '2 55% 83%',
  },
};

interface ThemeContextType {
  theme: ThemeColors;
  setTheme: (theme: ThemeColors) => void;
  applyPreset: (presetName: string) => void;
  resetToDefault: () => void;
  exportTheme: () => string;
  importTheme: (jsonString: string) => boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeColors>(DEFAULT_DARK_THEME);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('userTheme');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        setThemeState(parsed);
        applyThemeToDOM(parsed);
      } catch (error) {
        console.error('Failed to parse saved theme', error);
      }
    } else {
      applyThemeToDOM(DEFAULT_DARK_THEME);
    }
  }, []);

  // Apply theme to DOM by updating CSS variables
  const applyThemeToDOM = (themeColors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--background', themeColors.background);
    root.style.setProperty('--foreground', themeColors.foreground);
    root.style.setProperty('--card', themeColors.card);
    root.style.setProperty('--card-foreground', themeColors.cardForeground);
    root.style.setProperty('--popover', themeColors.popover);
    root.style.setProperty('--popover-foreground', themeColors.popoverForeground);
    root.style.setProperty('--primary', themeColors.primary);
    root.style.setProperty('--primary-foreground', themeColors.primaryForeground);
    root.style.setProperty('--secondary', themeColors.secondary);
    root.style.setProperty('--secondary-foreground', themeColors.secondaryForeground);
    root.style.setProperty('--muted', themeColors.muted);
    root.style.setProperty('--muted-foreground', themeColors.mutedForeground);
    root.style.setProperty('--accent', themeColors.accent);
    root.style.setProperty('--accent-foreground', themeColors.accentForeground);
    root.style.setProperty('--destructive', themeColors.destructive);
    root.style.setProperty('--destructive-foreground', themeColors.destructiveForeground);
    root.style.setProperty('--border', themeColors.border);
    root.style.setProperty('--input', themeColors.input);
    root.style.setProperty('--ring', themeColors.ring);
  };

  const setTheme = (newTheme: ThemeColors) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
    localStorage.setItem('userTheme', JSON.stringify(newTheme));
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESET_THEMES[presetName];
    if (preset) {
      setTheme(preset);
    }
  };

  const resetToDefault = () => {
    setTheme(DEFAULT_DARK_THEME);
  };

  const exportTheme = (): string => {
    return JSON.stringify(theme, null, 2);
  };

  const importTheme = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      // Validate that all required keys exist
      const requiredKeys = Object.keys(DEFAULT_DARK_THEME);
      const hasAllKeys = requiredKeys.every(key => key in parsed);
      if (hasAllKeys) {
        setTheme(parsed);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import theme', error);
      return false;
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        applyPreset,
        resetToDefault,
        exportTheme,
        importTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
