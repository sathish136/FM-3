import { useState, useEffect } from "react";

export type ThemePreset = {
  name: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  sidebar: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  { name: "Indigo",  accent: "#6366f1", accentLight: "#eef2ff", accentDark: "#4338ca", sidebar: "#1e1b4b" },
  { name: "Blue",    accent: "#3b82f6", accentLight: "#eff6ff", accentDark: "#1d4ed8", sidebar: "#172554" },
  { name: "Violet",  accent: "#8b5cf6", accentLight: "#f5f3ff", accentDark: "#6d28d9", sidebar: "#2e1065" },
  { name: "Rose",    accent: "#f43f5e", accentLight: "#fff1f2", accentDark: "#be123c", sidebar: "#4c0519" },
  { name: "Emerald", accent: "#10b981", accentLight: "#ecfdf5", accentDark: "#065f46", sidebar: "#022c22" },
  { name: "Orange",  accent: "#f97316", accentLight: "#fff7ed", accentDark: "#c2410c", sidebar: "#431407" },
  { name: "Slate",   accent: "#64748b", accentLight: "#f1f5f9", accentDark: "#334155", sidebar: "#0f172a" },
  { name: "Cyan",    accent: "#06b6d4", accentLight: "#ecfeff", accentDark: "#0e7490", sidebar: "#083344" },
];

const STORAGE_KEY = "fm-theme-index";

function applyTheme(preset: ThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--theme-accent", preset.accent);
  root.style.setProperty("--theme-accent-light", preset.accentLight);
  root.style.setProperty("--theme-accent-dark", preset.accentDark);
  root.style.setProperty("--theme-sidebar", preset.sidebar);
}

export function useTheme() {
  const [themeIndex, setThemeIndex] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const theme = THEME_PRESETS[themeIndex] ?? THEME_PRESETS[0];

  useEffect(() => {
    applyTheme(theme);
  }, [themeIndex]);

  useEffect(() => {
    applyTheme(THEME_PRESETS[themeIndex] ?? THEME_PRESETS[0]);
  }, []);

  const setTheme = (index: number) => {
    setThemeIndex(index);
    localStorage.setItem(STORAGE_KEY, String(index));
  };

  return { theme, themeIndex, setTheme, presets: THEME_PRESETS };
}
