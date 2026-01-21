import React, { createContext, useContext, useState, useEffect } from 'react';
import { applyTheme, themePresets } from '@devvoid/ui';
import type { ThemeTokens } from '@devvoid/ui';

// Re-export types and presets for backwards compatibility
export type ThemeColors = ThemeTokens;
export const DEFAULT_DARK_THEME = themePresets.dark;
export const DEFAULT_LIGHT_THEME = themePresets.light;
export const PRESET_THEMES = themePresets;

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
        applyTheme(parsed);
      } catch (error) {
        console.error('Failed to parse saved theme', error);
      }
    } else {
      applyTheme(DEFAULT_DARK_THEME);
    }
  }, []);

  const setTheme = (newTheme: ThemeColors) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('userTheme', JSON.stringify(newTheme));
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESET_THEMES[presetName as keyof typeof PRESET_THEMES];
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
