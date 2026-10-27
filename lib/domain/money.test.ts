import { describe, expect, it } from "vitest";
import { computeBalance, debtOf, describeExpense, formatEuros, parseAmount, settlementFor, splitShares, type DebtSource } from "./money";

const shared = (amountCents: number, paidBy: DebtSource["paidBy"]): DebtSource => ({ amountCents, scope: "shared", paidBy });

describe("montants", () => {
  it("lit la virgule française, 2 décimales maximum", () => {
    expect(parseAmount("45,80")).toBe(4580);
    expect(parseAmount("45.8")).toBe(4580);
    expect(parseAmount("1 234,5")).toBe(123450);
    expect(parseAmount("12")).toBe(1200);
    expect(parseAmount("12,345")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("99999,99")).toBe(9_999_999);
    expect(parseAmount("100000")).toBeNull();
  });
  it("affiche en euros", () => {
    expect(formatEuros(2053)).toBe("20,53 €");
    expect(formatEuros(115000).replace(/\s/g, " ")).toBe("1 150,00 €");
  });
});

describe("cas de référence des Comptes (section 15)", () => {
  it("86,40 € payée par Lionel : Jaz doit 34,56 €", () => {
    expect(debtOf(shared(8640, "lionel"))).toEqual({ from: "jaz", to: "lionel", amountCents: 3456 });
  });
  it("72,00 € payée par Jaz : Lionel doit 43,20 €", () => {
    expect(debtOf(shared(7200, "jaz"))).toEqual({ from: "lionel", to: "jaz", amountCents: 4320 });
  });
  it("29,99 € payée par Jaz : part de Jaz 12,00 €, Lionel doit 17,99 €", () => {
    expect(splitShares(2999)).toEqual({ jaz: 1200, lionel: 1799 });
    expect(debtOf(shared(2999, "jaz"))?.amountCents).toBe(1799);
  });
  it("la somme des parts fait toujours le montant", () => {
    for (let a = 1; a < 5000; a += 7) {
      const s = splitShares(a);
      expect(s.jaz + s.lionel).toBe(a);
    }
  });
  it("les cinq dépenses : Jaz doit 20,53 € à Lionel", () => {
    const b = computeBalance([shared(8640, "lionel"), shared(6390, "lionel"), shared(5400, "lionel"), shared(7200, "jaz"), shared(2999, "jaz")], []);
    expect(b).toEqual({ dueByJaz: 8172, dueByLionel: 6119, balanceCents: 2053 });
  });
  it("après « Régler », le solde vaut 0", () => {
    const expenses = [shared(8640, "lionel"), shared(7200, "jaz")];
    const s = settlementFor(computeBalance(expenses, []).balanceCents)!;
    expect(s).toEqual({ from: "lionel", to: "jaz", amountCents: 864 });
    expect(computeBalance(expenses, [s]).balanceCents).toBe(0);
    expect(settlementFor(0)).toBeNull();
  });
  it("une dépense perso ou payée par les deux ne change pas le solde", () => {
    expect(debtOf({ amountCents: 3000, scope: "personal", paidBy: "jaz" })).toBeNull();
    expect(debtOf(shared(7200, "both"))).toBeNull();
    expect(computeBalance([{ amountCents: 3000, scope: "personal", paidBy: "jaz" }, shared(7200, "both")], []).balanceCents).toBe(0);
  });
  it("facture de 72 € payée par Lionel seul : Jaz doit 28,80 €", () => {
    expect(debtOf(shared(7200, "lionel"))?.amountCents).toBe(2880);
  });
});

describe("aperçu du formulaire", () => {
  it("45,80 € commune payée par Lionel", () => {
    const [a, b] = describeExpense({ amountCents: 4580, scope: "shared", paidBy: "lionel" });
    expect(a.replace(/ /g, " ")).toBe("Commune, 60 / 40 : Lionel 27,48 € · Jaz 18,32 €");
    expect(b.replace(/ /g, " ")).toBe("Jaz devra 18,32 € à Lionel.");
  });
});
