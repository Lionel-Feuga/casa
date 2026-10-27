// Catégories (section 4) : une seule liste pour les dépenses et les budgets. Divers ne peut jamais être supprimée.
export const DEFAULT_CATEGORIES = [
  "Courses",
  "Restaurants",
  "Sorties",
  "Divertissements",
  "Maison",
  "Factures",
  "Divers",
] as const;

export const FALLBACK_CATEGORY_KEY = "divers";
export const CATEGORY_NAME_MAX = 30;

export interface Category {
  id: string;
  name: string;
  key: string;
  isDefault: boolean;
}

export type CategoryIcon = "basket" | "fork" | "ticket" | "gamepad" | "home" | "bolt" | "box" | "tag";

const ICONS: Record<string, CategoryIcon> = {
  courses: "basket",
  restaurants: "fork",
  sorties: "ticket",
  divertissements: "gamepad",
  maison: "home",
  factures: "bolt",
  divers: "box",
};

/** Icône d'une catégorie : celles par défaut ont la leur, une catégorie créée reçoit l'étiquette. */
export const categoryIcon = (c: Pick<Category, "key" | "isDefault">): CategoryIcon => (c.isDefault && ICONS[c.key]) || "tag";

/** Ordre d'affichage : les catégories par défaut dans leur ordre, puis celles créées. */
export function sortCategories<T extends Pick<Category, "key" | "isDefault">>(list: T[]): T[] {
  const rank = (c: T) => {
    const i = DEFAULT_CATEGORIES.findIndex((n) => n.toLowerCase() === c.key);
    return c.isDefault && i >= 0 ? i : DEFAULT_CATEGORIES.length;
  };
  return [...list].sort((a, b) => rank(a) - rank(b));
}
