"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/themes";
import type { ThemeId, Theme } from "@/lib/themes";

interface ThemeContextValue {
  themeId: ThemeId;
  theme: Theme;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME,
  theme: THEMES[0],
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(id: ThemeId) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;

  // Set data-theme attribute
  root.setAttribute("data-theme", id);

  // Apply CSS variable overrides
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }

  // Apply background
  document.body.style.background = theme.background;
  document.body.style.minHeight = "100vh";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // On mount, read persisted theme and apply it
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    const id = stored && THEMES.find((t) => t.id === stored) ? stored : DEFAULT_THEME;
    setThemeId(id);
    applyTheme(id);
    setMounted(true);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    applyTheme(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  // Prevent flash of wrong theme — render children once mounted
  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme }}>
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
