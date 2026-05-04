import { useEffect, useState, useCallback } from "react";

const KEY = "siteDb:labels";

export type DbLabels = Record<string, string>;

export function getDbLabels(): DbLabels {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export function saveDbLabels(labels: DbLabels) {
  try {
    localStorage.setItem(KEY, JSON.stringify(labels));
    window.dispatchEvent(new CustomEvent("siteDb:labels-changed"));
  } catch {}
}

export function dbDisplay(name: string, labels: DbLabels): string {
  if (!name) return "";
  return labels[name] && labels[name].trim() ? labels[name] : name;
}

/**
 * React hook returning the current label map plus a setter and a remover.
 * Auto-syncs across tabs and across components via storage / custom event.
 */
export function useDbLabels() {
  const [labels, setLabels] = useState<DbLabels>(() => getDbLabels());

  useEffect(() => {
    const sync = () => setLabels(getDbLabels());
    window.addEventListener("storage", sync);
    window.addEventListener("siteDb:labels-changed", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("siteDb:labels-changed", sync as EventListener);
    };
  }, []);

  const setLabel = useCallback((name: string, label: string) => {
    const next = { ...getDbLabels() };
    const trimmed = label.trim();
    if (trimmed && trimmed !== name) next[name] = trimmed;
    else delete next[name];
    saveDbLabels(next);
    setLabels(next);
  }, []);

  const removeLabel = useCallback((name: string) => {
    const next = { ...getDbLabels() };
    delete next[name];
    saveDbLabels(next);
    setLabels(next);
  }, []);

  const display = useCallback((name: string) => dbDisplay(name, labels), [labels]);

  return { labels, setLabel, removeLabel, display };
}
