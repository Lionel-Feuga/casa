import { splitShares, type Payer, type Scope } from "./money";
import type { Profile } from "./profile";

// Budgets d'un mois (section 6.2). Fonctions pures, montants en centimes.

export type BudgetView = "shared" | Profile;

export interface BudgetExpense {
  categoryId: string;
  amountCents: number;
  scope: Scope;
  paidBy: Payer;
  owner?: Profile;
}

export interface BudgetLine {
  categoryId: string;
  /** Total compté dans la vue (montant entier en Commun, part + perso en Mon perso). */
  spentCents: number;
  /** Mon perso : ma part des dépenses communes. */
  sharedPartCents: number;
  /** Mon perso : mes dépenses perso. */
  personalCents: number;
  limitCents: number | null;
}

/** Ce que compte une dépense dans une vue : null si elle n'y figure pas. */
export function countIn(e: BudgetExpense, view: BudgetView): { shared: number; personal: number } | null {
  if (view === "shared") return e.scope === "shared" ? { shared: e.amountCents, personal: 0 } : null;
  if (e.scope === "shared") return { shared: splitShares(e.amountCents)[view], personal: 0 };
  return e.owner === view ? { shared: 0, personal: e.amountCents } : null;
}

export function computeBudget(
  expenses: BudgetExpense[],
  view: BudgetView,
  categoryIds: string[],
  limits: Record<string, number | null> = {},
): { lines: BudgetLine[]; totalCents: number; sharedPartCents: number; personalCents: number } {
  const lines = new Map<string, BudgetLine>(
    categoryIds.map((id) => [id, { categoryId: id, spentCents: 0, sharedPartCents: 0, personalCents: 0, limitCents: limits[id] ?? null }]),
  );
  for (const e of expenses) {
    const c = countIn(e, view);
    if (!c) continue;
    let line = lines.get(e.categoryId);
    if (!line) {
      line = { categoryId: e.categoryId, spentCents: 0, sharedPartCents: 0, personalCents: 0, limitCents: limits[e.categoryId] ?? null };
      lines.set(e.categoryId, line);
    }
    line.sharedPartCents += c.shared;
    line.personalCents += c.personal;
    line.spentCents += c.shared + c.personal;
  }
  const all = [...lines.values()];
  return {
    lines: all,
    totalCents: all.reduce((s, l) => s + l.spentCents, 0),
    sharedPartCents: all.reduce((s, l) => s + l.sharedPartCents, 0),
    personalCents: all.reduce((s, l) => s + l.personalCents, 0),
  };
}

/** Dépassement du plafond, en centimes (0 si aucun ou sans plafond). */
export const overBy = (l: Pick<BudgetLine, "spentCents" | "limitCents">): number =>
  l.limitCents !== null && l.spentCents > l.limitCents ? l.spentCents - l.limitCents : 0;

/** Jours restants dans le mois après aujourd'hui (« encore 5 jours » le 26 octobre). */
export function daysLeft(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - d;
}
