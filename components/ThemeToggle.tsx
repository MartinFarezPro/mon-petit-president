"use client";

import { useEffect, useState } from "react";

type Theme = "auto" | "light" | "dark";
const NEXT: Record<Theme, Theme> = { auto: "light", light: "dark", dark: "auto" };
const LABEL: Record<Theme, string> = { auto: "Thème : comme l'appareil", light: "Thème : clair", dark: "Thème : sombre" };
const ICON: Record<Theme, string> = { auto: "◐", light: "☀", dark: "☾" };

/** Bascule auto → clair → sombre, mémorisée sur l'appareil. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);

  function cycle() {
    // On lit l'état réel de la page (deux clics rapides ne doivent pas se marcher dessus)
    const cur = (document.documentElement.dataset.theme as Theme | undefined) ?? "auto";
    const t = NEXT[cur];
    setTheme(t);
    try {
      if (t === "auto") localStorage.removeItem("theme");
      else localStorage.setItem("theme", t);
    } catch {}
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }

  return (
    <button type="button" className="theme-toggle" onClick={cycle} aria-label={`${LABEL[theme]} (changer)`} title={LABEL[theme]}>
      <span aria-hidden="true" suppressHydrationWarning>{ICON[theme]}</span>
    </button>
  );
}
