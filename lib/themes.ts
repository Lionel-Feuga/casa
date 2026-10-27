// Six thèmes de couleurs (cahier des charges, section 9). Doit rester aligné avec styles/tokens.css.
export const THEMES = [
  { id: "original", name: "Original", y: "#FFE14D", pk: "#FF4F8B" },
  { id: "piscine", name: "Piscine", y: "#5CC8FF", pk: "#FF5DA2" },
  { id: "pistache", name: "Pistache & framboise", y: "#C6E77A", pk: "#E8336D" },
  { id: "lagon", name: "Lagon & mangue", y: "#2EC4B6", pk: "#FF9F1C" },
  { id: "cerise", name: "Bonbon cerise", y: "#FF8FB3", pk: "#FFE14D" },
  { id: "agrume", name: "Agrume", y: "#FFA62B", pk: "#2E5BFF" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "original";
export const THEME_STORAGE_KEY = "casa.theme";

export function isThemeId(v: unknown): v is ThemeId {
  return THEMES.some((t) => t.id === v);
}

// Script exécuté dans <head> avant le premier affichage, pour éviter le flash de l'ancien thème.
export const themeBootScript = `(function(){try{var m=${JSON.stringify(
  Object.fromEntries(THEMES.map((t) => [t.id, t.y])),
)};var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(!m[t])t=${JSON.stringify(
  DEFAULT_THEME,
)};document.documentElement.setAttribute('data-theme',t);var c=document.querySelector('meta[name="theme-color"]');if(!c){c=document.createElement('meta');c.setAttribute('name','theme-color');document.head.appendChild(c);}c.setAttribute('content',m[t]);}catch(e){}})();`;
