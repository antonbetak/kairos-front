import React, { createContext, useContext, useState, useCallback } from 'react';
import { themes, KairosTheme, DEFAULT_THEME_ID } from '../styles/themes';

interface ThemeContextValue {
  theme: KairosTheme;
  themeId: string;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes[DEFAULT_THEME_ID],
  themeId: DEFAULT_THEME_ID,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);

  const setTheme = useCallback((id: string) => {
    if (themes[id]) setThemeId(id);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: themes[themeId], themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}