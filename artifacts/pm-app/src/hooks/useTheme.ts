import { useState, useEffect } from "react";

export type ThemePreset = {
  name: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  sidebar: string;
  primaryHsl: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  { name: "Indigo",  accent: "#6366f1", accentLight: "#eef2ff", accentDark: "#4338ca", sidebar: "#1e1b4b", primaryHsl: "239 84% 67%" },
  { name: "Blue",    accent: "#3b82f6", accentLight: "#eff6ff", accentDark: "#1d4ed8", sidebar: "#172554", primaryHsl: "217 91% 60%" },
  { name: "Violet",  accent: "#8b5cf6", accentLight: "#f5f3ff", accentDark: "#6d28d9", sidebar: "#2e1065", primaryHsl: "258 90% 66%" },
  { name: "Rose",    accent: "#f43f5e", accentLight: "#fff1f2", accentDark: "#be123c", sidebar: "#4c0519", primaryHsl: "351 95% 61%" },
  { name: "Emerald", accent: "#10b981", accentLight: "#ecfdf5", accentDark: "#065f46", sidebar: "#022c22", primaryHsl: "160 84% 39%" },
  { name: "Orange",  accent: "#f97316", accentLight: "#fff7ed", accentDark: "#c2410c", sidebar: "#431407", primaryHsl: "24 95% 53%"  },
  { name: "Slate",   accent: "#64748b", accentLight: "#f1f5f9", accentDark: "#334155", sidebar: "#0f172a", primaryHsl: "215 16% 47%" },
  { name: "Cyan",    accent: "#06b6d4", accentLight: "#ecfeff", accentDark: "#0e7490", sidebar: "#083344", primaryHsl: "192 91% 43%" },
];

const THEME_KEY = "fm-theme-index";
const DARK_KEY  = "fm-dark-mode";

function applyTheme(preset: ThemePreset) {
  const root = document.documentElement;
  root.style.setProperty("--theme-accent",       preset.accent);
  root.style.setProperty("--theme-accent-light",  preset.accentLight);
  root.style.setProperty("--theme-accent-dark",   preset.accentDark);
  root.style.setProperty("--theme-sidebar",       preset.sidebar);
  root.style.setProperty("--primary",             preset.primaryHsl);
  root.style.setProperty("--ring",                preset.primaryHsl);
  root.style.setProperty("--sidebar-primary",     preset.primaryHsl);
  root.style.setProperty("--sidebar-ring",        preset.primaryHsl);
  root.style.setProperty("--chart-1",             preset.primaryHsl);
}

function applyDark(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme() {
  const [themeIndex, setThemeIndex] = useState<number>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(DARK_KEY);
    return saved === "true";
  });

  const theme = THEME_PRESETS[themeIndex] ?? THEME_PRESETS[0];

  useEffect(() => { applyTheme(theme); }, [themeIndex]);
  useEffect(() => { applyDark(darkMode); }, [darkMode]);

  useEffect(() => {
    applyTheme(THEME_PRESETS[themeIndex] ?? THEME_PRESETS[0]);
    applyDark(localStorage.getItem(DARK_KEY) === "true");
  }, []);

  const setTheme = (index: number) => {
    setThemeIndex(index);
    localStorage.setItem(THEME_KEY, String(index));
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem(DARK_KEY, String(next));
  };

  return { theme, themeIndex, setTheme, presets: THEME_PRESETS, darkMode, toggleDarkMode };
}
