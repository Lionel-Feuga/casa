import { generateKeyBetween } from "fractional-indexing";
import { normalizeName } from "./normalize";
import type { Profile } from "./profile";

// Liste de courses (section 3). Fonctions pures, partagées entre le serveur et le téléphone.

export const ITEM_NAME_MAX = 80;
export const SUGGESTION_LIMIT = 5;

export interface ShoppingItem {
  id: string;
  name: string;
  position: string;
  checked: boolean;
  checkedAt?: string;
  checkedBy?: Profile;
  addedBy: Profile;
  createdAt: string;
}

export interface Suggestion {
  key: string;
  label: string;
  count: number;
  lastAddedAt: string;
}

/** Nom tel qu'affiché : espaces en trop retirés. Chaîne vide si rien à ajouter. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, ITEM_NAME_MAX);
}

/** Ordre de la liste : position (index fractionnaire, comparaison binaire), puis id en cas d'égalité. */
export function compareItems(a: ShoppingItem, b: ShoppingItem): number {
  if (a.position !== b.position) return a.position < b.position ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort(compareItems);
}

/** Article déjà présent au nom normalisé identique (coché ou non). */
export function findDuplicate(items: ShoppingItem[], name: string): ShoppingItem | undefined {
  const key = normalizeName(name);
  if (!key) return undefined;
  // Un article non coché l'emporte sur un article coché du même nom.
  const same = items.filter((i) => normalizeName(i.name) === key);
  return same.find((i) => !i.checked) ?? same[0];
}

/** Position d'un article ajouté en bas de la liste. */
export function positionAtEnd(items: ShoppingItem[]): string {
  const last = sortItems(items).at(-1);
  return generateKeyBetween(last?.position ?? null, null);
}

/**
 * Nouvelle position d'un article déplacé de l'index `from` à l'index `to` dans la liste triée.
 * Un seul document change (section 3.4).
 */
export function positionForMove(sorted: ShoppingItem[], from: number, to: number): string {
  const rest = sorted.filter((_, i) => i !== from);
  const before = rest[to - 1]?.position ?? null;
  const after = rest[to]?.position ?? null;
  // Deux positions égales (ajouts simultanés) : on se place juste après la première.
  if (before !== null && after !== null && before >= after) return generateKeyBetween(before, null);
  return generateKeyBetween(before, after);
}

/**
 * Suggestions (section 3.3) : début du nom normalisé, triées par nombre d'ajouts puis par dernier ajout.
 * Les articles déjà présents et non cochés ne sont pas suggérés.
 */
export function rankSuggestions(
  history: Suggestion[],
  query: string,
  items: ShoppingItem[],
  limit = SUGGESTION_LIMIT,
): Suggestion[] {
  const q = normalizeName(query);
  if (!q) return [];
  const present = new Set(items.filter((i) => !i.checked).map((i) => normalizeName(i.name)));
  return history
    .filter((h) => h.key.startsWith(q) && !present.has(h.key))
    .sort((a, b) => b.count - a.count || (a.lastAddedAt < b.lastAddedAt ? 1 : a.lastAddedAt > b.lastAddedAt ? -1 : 0))
    .slice(0, limit);
}
