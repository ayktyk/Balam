import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, DEFAULT_THEME } from '../constants/themes';
import type { ThemeId, ThemeColors, ThemeDefinition } from '../constants/themes';

const STORAGE_KEY = '@balam_theme';

type ThemeContextValue = {
  themeId: ThemeId;
  colors: ThemeColors;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME,
  colors: THEMES[DEFAULT_THEME].colors,
  theme: THEMES[DEFAULT_THEME],
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored in THEMES) {
        setThemeId(stored as ThemeId);
      }
    });
  }, []);

  function setTheme(id: ThemeId) {
    setThemeId(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  }

  const theme = THEMES[themeId];

  return (
    <ThemeContext.Provider value={{ themeId, colors: theme.colors, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
