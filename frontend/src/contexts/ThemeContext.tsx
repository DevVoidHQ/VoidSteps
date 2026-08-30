import React, { createContext, useContext, useState, useEffect } from 'react';
import { applyTheme } from '@/lib/apply-theme';
import { themePresets } from '@/lib/theme-presets';
import type { ThemeTokens } from '@/lib/theme-types';

export type ThemeColors = ThemeTokens;
const DEFAULT_THEME = themePresets.devvoid;
export const PRESET_THEMES = themePresets;

const SAVED_THEMES_KEY = "savedThemes";

export interface SavedTheme {
  id: string;
  name: string;
  colors: ThemeColors;
}

interface ThemeContextType {
  theme: ThemeColors;
  setTheme: (theme: ThemeColors) => void;
  applyPreset: (presetName: string) => void;
  resetToDefault: () => void;
  exportTheme: () => string;
  importTheme: (jsonString: string) => boolean;
  savedThemes: SavedTheme[];
  saveCurrentTheme: (name: string) => void;
  deleteSavedTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeColors>(DEFAULT_THEME);
  const [savedThemes, setSavedThemes] = useState<SavedTheme[]>([]);

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
      applyTheme(DEFAULT_THEME);
    }

    const stored = localStorage.getItem(SAVED_THEMES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedThemes(parsed);
      } catch (error) {
        console.error('Failed to parse saved themes', error);
      }
    }
  }, []);

  const persistSavedThemes = (next: SavedTheme[]) => {
    setSavedThemes(next);
    localStorage.setItem(SAVED_THEMES_KEY, JSON.stringify(next));
  };

  const saveCurrentTheme = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `theme-${Date.now()}`;
    persistSavedThemes([...savedThemes, { id, name: trimmed, colors: theme }]);
  };

  const deleteSavedTheme = (id: string) => {
    persistSavedThemes(savedThemes.filter((t) => t.id !== id));
  };

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
    setTheme(DEFAULT_THEME);
  };

  const exportTheme = (): string => {
    return JSON.stringify(theme, null, 2);
  };

  const importTheme = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      // Validate that all required keys exist
      const requiredKeys = Object.keys(DEFAULT_THEME).filter(
        (k) => k !== "primaryLight" && k !== "accentLight"
      );
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
        savedThemes,
        saveCurrentTheme,
        deleteSavedTheme,
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
