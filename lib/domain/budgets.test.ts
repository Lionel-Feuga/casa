import { describe, expect, it } from "vitest";
import { computeBudget, daysLeft, overBy, type BudgetExpense } from "./budgets";

const resto = "resto";
const sorties = "sorties";
const factures = "factures";

const shared = (categoryId: string, amountCents: number, paidBy: BudgetExpense["paidBy"] = "lionel"): BudgetExpense => ({ categoryId, amountCents, scope: "shared", paidBy });
const perso = (categoryId: string, amountCents: number, owner: "lionel" | "jaz"): BudgetExpense => ({ categoryId, amountCents, scope: "personal", paidBy: owner, owner });

const line = (r: ReturnType<typeof computeBudget>, id: string) => r.lines.find((l) => l.categoryId === id)!;

describe("budgets (section 15)", () => {
  const cats = [resto, sorties, factures];

  it("dépense commune de 100 € en Restaurants : Commun +100, Lionel +60, Jaz +40", () => {
    const ex = [shared(resto, 10000)];
    expect(line(computeBudget(ex, "shared", cats), resto).spentCents).toBe(10000);
    expect(line(computeBudget(ex, "lionel", cats), resto).spentCents).toBe(6000);
    expect(line(computeBudget(ex, "jaz", cats), resto).spentCents).toBe(4000);
  });

  it("dépense perso de Jaz de 30 € en Sorties : seulement le perso de Jaz", () => {
    const ex = [perso(sorties, 3000, "jaz")];
    expect(computeBudget(ex, "shared", cats).totalCents).toBe(0);
    expect(computeBudget(ex, "lionel", cats).totalCents).toBe(0);
    const j = computeBudget(ex, "jaz", cats);
    expect(line(j, sorties)).toMatchObject({ spentCents: 3000, personalCents: 3000, sharedPartCents: 0 });
  });

  it("facture de 72 € payée par les deux : Commun 72, Lionel 43,20, Jaz 28,80", () => {
    const ex = [shared(factures, 7200, "both")];
    expect(line(computeBudget(ex, "shared", cats), factures).spentCents).toBe(7200);
    expect(line(computeBudget(ex, "lionel", cats), factures).spentCents).toBe(4320);
    expect(line(computeBudget(ex, "jaz", cats), factures).spentCents).toBe(2880);
  });

  it("totaux du perso : part commune + dépenses perso", () => {
    const r = computeBudget([shared(resto, 10000), perso(sorties, 2500, "lionel"), perso(sorties, 999, "jaz")], "lionel", cats);
    expect(r).toMatchObject({ totalCents: 8500, sharedPartCents: 6000, personalCents: 2500 });
  });

  it("toutes les catégories apparaissent, même sans dépense, avec leur plafond", () => {
    const r = computeBudget([], "shared", cats, { resto: 12000 });
    expect(r.lines).toHaveLength(3);
    expect(line(r, resto).limitCents).toBe(12000);
    expect(line(r, sorties).limitCents).toBeNull();
  });

  it("dépassement", () => {
    expect(overBy({ spentCents: 11200, limitCents: 10000 })).toBe(1200);
    expect(overBy({ spentCents: 9000, limitCents: 10000 })).toBe(0);
    expect(overBy({ spentCents: 9000, limitCents: null })).toBe(0);
  });

  it("jours restants", () => {
    expect(daysLeft("2026-10-26")).toBe(5);
    expect(daysLeft("2026-02-28")).toBe(0);
    expect(daysLeft("2028-02-28")).toBe(1);
  });
});
