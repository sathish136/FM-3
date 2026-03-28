import { useState, useEffect } from "react";

export type NavStyle = "sidebar" | "launcher";

const STORAGE_KEY = "fm_nav_style";

export function useNavStyle() {
  const [navStyle, setNavStyleState] = useState<NavStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "sidebar" || saved === "launcher") return saved;
    } catch {}
    return "launcher";
  });

  const setNavStyle = (style: NavStyle) => {
    setNavStyleState(style);
    try {
      localStorage.setItem(STORAGE_KEY, style);
    } catch {}
  };

  return { navStyle, setNavStyle };
}
