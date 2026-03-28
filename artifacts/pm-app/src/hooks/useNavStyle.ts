import { useState, useEffect } from "react";

export type NavStyle = "sidebar" | "launcher";

const STORAGE_KEY = "fm_nav_style";
const EVENT_NAME = "fm_nav_style_change";

export function useNavStyle() {
  const [navStyle, setNavStyleState] = useState<NavStyle>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "sidebar" || saved === "launcher") return saved;
    } catch {}
    return "launcher";
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NavStyle>).detail;
      if (detail === "sidebar" || detail === "launcher") {
        setNavStyleState(detail);
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const setNavStyle = (style: NavStyle) => {
    setNavStyleState(style);
    try {
      localStorage.setItem(STORAGE_KEY, style);
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: style }));
  };

  return { navStyle, setNavStyle };
}
