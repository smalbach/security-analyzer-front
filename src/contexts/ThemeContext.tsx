import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  DEFAULT_THEME,
  getThemeOption,
  isThemeMode,
  isThemeName,
  resolveThemeMode,
  type ThemeMode,
  type ThemeName,
} from './themeOptions';

interface ThemeContextValue {
  theme: ThemeName;
  mode: ThemeMode;
  preferredMode: ThemeMode;
  availableModes: ThemeMode[];
  setTheme: (theme: ThemeName) => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  mode: 'dark',
  preferredMode: 'dark',
  availableModes: getThemeOption(DEFAULT_THEME).modes,
  setTheme: () => {},
  setMode: () => {},
});

const THEME_STORAGE_KEY = 'asa-theme';
const MODE_STORAGE_KEY = 'asa-theme-mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : DEFAULT_THEME;
  });
  const [preferredMode, setPreferredMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'dark';
  });
  const availableModes = getThemeOption(theme).modes;
  const mode = resolveThemeMode(theme, preferredMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-mode', mode);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, mode]);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, preferredMode);
  }, [preferredMode]);

  const setTheme = (next: ThemeName) => setThemeState(next);
  const setMode = (next: ThemeMode) => setPreferredMode(next);

  return (
    <ThemeContext.Provider value={{ theme, mode, preferredMode, availableModes, setTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
