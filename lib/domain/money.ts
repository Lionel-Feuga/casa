import type { Profile } from "./profile";

// Argent (sections 5.1 à 5.3). Tous les montants sont en centimes entiers.

export const MAX_AMOUNT_CENTS = 9_999_999; // 99 999,99 €
export const JAZ_SHARE = 0.4;

export type Payer = Profile | "both";
export type Scope = "shared" | "personal";

/** « 45,80 » ou « 45.8 » ou « 1 234,5 » → 4580. null si invalide, nul ou trop grand. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [euros, dec = ""] = s.split(".");
  const cents = Number(euros) * 100 + Number(dec.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

const fmt = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 4580 → « 45,80 € » (espaces insécables, comme le reste de l'appli). */
export function formatEuros(cents: number): string {
  return `${fmt.format(cents / 100)} €`;
}

/** Saisie en cours affichée telle quelle dans le champ montant. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Parts d'une dépense commune : la somme fait toujours exactement le montant (section 5.2). */
export function splitShares(amountCents: number): Record<Profile, number> {
  const jaz = Math.round(amountCents * JAZ_SHARE);
  return { jaz, lionel: amountCents - jaz };
}

export interface DebtSource {
  amountCents: number;
  scope: Scope;
  paidBy: Payer;
}

/** Dette créée par une dépense : qui doit combien à qui. null si aucune (perso, ou payée par les deux). */
export function debtOf(e: DebtSource): { from: Profile; to: Profile; amountCents: number } | null {
  if (e.scope !== "shared" || e.paidBy === "both") return null;
  const shares = splitShares(e.amountCents);
  return e.paidBy === "lionel"
    ? { from: "jaz", to: "lionel", amountCents: shares.jaz }
    : { from: "lionel", to: "jaz", amountCents: shares.lionel };
}

export interface SettlementSource {
  from: Profile;
  to: Profile;
  amountCents: number;
}

export interface Balance {
  /** > 0 : Jaz doit à Lionel ; < 0 : Lionel doit à Jaz. */
  balanceCents: number;
  dueByJaz: number;
  dueByLionel: number;
}

/** Solde net après compensation (section 5.3). */
export function computeBalance(expenses: DebtSource[], settlements: SettlementSource[]): Balance {
  let dueByJaz = 0;
  let dueByLionel = 0;
  for (const e of expenses) {
    const d = debtOf(e);
    if (!d) continue;
    if (d.from === "jaz") dueByJaz += d.amountCents;
    else dueByLionel += d.amountCents;
  }
  let balanceCents = dueByJaz - dueByLionel;
  for (const s of settlements) balanceCents += s.from === "jaz" ? -s.amountCents : s.amountCents;
  return { balanceCents, dueByJaz, dueByLionel };
}

/** Règlement qui remet le solde à zéro, ou null si quittes. */
export function settlementFor(balanceCents: number): SettlementSource | null {
  if (balanceCents === 0) return null;
  return balanceCents > 0
    ? { from: "jaz", to: "lionel", amountCents: balanceCents }
    : { from: "lionel", to: "jaz", amountCents: -balanceCents };
}

/** Aperçu sous le formulaire de dépense (section 5.1). */
export function describeExpense(e: { amountCents: number | null; scope: Scope; paidBy: Profile }): string[] {
  if (e.scope === "personal") return ["Perso : seulement dans ton budget, pas dans les Comptes."];
  if (!e.amountCents) return ["Commune, partagée 60 / 40."];
  const s = splitShares(e.amountCents);
  const head = `Commune, 60 / 40 : Lionel ${formatEuros(s.lionel)} · Jaz ${formatEuros(s.jaz)}`;
  return [head, e.paidBy === "lionel" ? `Jaz devra ${formatEuros(s.jaz)} à Lionel.` : `Lionel devra ${formatEuros(s.lionel)} à Jaz.`];
}
