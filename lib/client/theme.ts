import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, THEMES, type ThemeId } from "@/lib/themes";
import { readLocal, writeLocal } from "./storage";

export function currentTheme(): ThemeId {
  const t = document.documentElement.getAttribute("data-theme") ?? readLocal(THEME_STORAGE_KEY);
  return isThemeId(t) ? t : DEFAULT_THEME;
}

// Changement immédiat, sans recharger, avec un fondu de 200 ms (sauf prefers-reduced-motion).
export function applyTheme(id: ThemeId): void {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    root.classList.add("theme-fade");
    window.setTimeout(() => root.classList.remove("theme-fade"), 260);
  }
  root.setAttribute("data-theme", id);
  writeLocal(THEME_STORAGE_KEY, id);
  const color = THEMES.find((t) => t.id === id)!.y;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}
