import { addMonths, monthOf, type Day, type Month } from "./dates";
import type { Payer } from "./money";
import type { Profile } from "./profile";

// Factures (section 8). Fonctions pures.

export type BillKind = "recurring" | "once";
export type BillEvery = "month" | "year";

export interface Bill {
  id: string;
  label: string;
  amountCents: number;
  categoryId: string;
  scope: "shared" | "personal";
  owner?: Profile;
  kind: BillKind;
  every?: BillEvery;
  dueDate: Day;
  dayOfMonth: number;
  paid: boolean;
  /** Prélèvement automatique : la facture se paie seule à son échéance. */
  autoPay?: boolean;
  /** Compte prélevé pour une facture commune en prélèvement. */
  autoPaidBy?: Payer;
}

const lastDayOf = (month: Month): number => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Jour d'origine dans un mois donné, ou le dernier jour du mois s'il n'existe pas (31 → 28 février). */
export function dayIn(month: Month, dayOfMonth: number): Day {
  return `${month}-${String(Math.min(dayOfMonth, lastDayOf(month))).padStart(2, "0")}`;
}

/** Échéance suivante d'une facture récurrente : on garde le jour d'origine (section 8.2). */
export function nextDueDate(due: Day, every: BillEvery, dayOfMonth: number): Day {
  return dayIn(addMonths(monthOf(due), every === "year" ? 12 : 1), dayOfMonth);
}

/** Au-delà, on arrête de rattraper les échéances passées (facture saisie avec une date très ancienne). */
const MAX_CATCH_UP = 24;

/**
 * Prélèvement automatique : une date de paiement par échéance passée ou du jour, puis l'échéance
 * suivante (récurrente) ou la facture payée (ponctuelle).
 */
export function autoPayments(
  b: Pick<Bill, "kind" | "every" | "dueDate" | "dayOfMonth" | "paid">,
  today: Day,
): { dates: Day[]; nextDue: Day; paid: boolean } {
  if (b.paid || b.dueDate > today) return { dates: [], nextDue: b.dueDate, paid: b.paid };
  if (b.kind === "once") return { dates: [b.dueDate], nextDue: b.dueDate, paid: true };
  const dates: Day[] = [];
  let due = b.dueDate;
  while (due <= today && dates.length < MAX_CATCH_UP) {
    dates.push(due);
    due = nextDueDate(due, b.every ?? "month", b.dayOfMonth);
  }
  return { dates, nextDue: due, paid: false };
}

export const isOverdue = (b: Pick<Bill, "dueDate" | "paid" | "autoPay">, today: Day): boolean => !b.paid && !b.autoPay && b.dueDate < today;

export interface BillSections {
  /** Échéance au plus tard à la fin du mois en cours, retards compris. */
  thisMonth: Bill[];
  nextMonth: Bill[];
  later: Bill[];
  /** « Reste à payer d'ici la fin du mois ». */
  remainingCents: number;
}

export function billSections(bills: Bill[], today: Day): BillSections {
  const month = monthOf(today);
  const next = addMonths(month, 1);
  const unpaid = bills.filter((b) => !b.paid).sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.label.localeCompare(b.label, "fr")));
  const thisMonth = unpaid.filter((b) => monthOf(b.dueDate) <= month);
  return {
    thisMonth,
    nextMonth: unpaid.filter((b) => monthOf(b.dueDate) === next),
    later: unpaid.filter((b) => monthOf(b.dueDate) > next),
    remainingCents: thisMonth.reduce((s, b) => s + b.amountCents, 0),
  };
}

export function kindLabel(b: Pick<Bill, "kind" | "every">): string {
  if (b.kind === "once") return "Une fois";
  return b.every === "year" ? "Chaque année" : "Chaque mois";
}
