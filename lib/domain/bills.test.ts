import { describe, expect, it } from "vitest";
import { autoPayments, billSections, isOverdue, nextDueDate, type Bill } from "./bills";

const bill = (id: string, dueDate: string, amountCents: number, extra: Partial<Bill> = {}): Bill => ({
  id,
  label: id,
  amountCents,
  categoryId: "factures",
  scope: "shared",
  kind: "recurring",
  every: "month",
  dueDate,
  dayOfMonth: Number(dueDate.slice(8)),
  paid: false,
  ...extra,
});

describe("récurrence (section 15)", () => {
  it("due le 31 janvier : 28 février, puis 31 mars", () => {
    const feb = nextDueDate("2027-01-31", "month", 31);
    expect(feb).toBe("2027-02-28");
    expect(nextDueDate(feb, "month", 31)).toBe("2027-03-31");
  });
  it("année bissextile : 29 février", () => {
    expect(nextDueDate("2028-01-31", "month", 31)).toBe("2028-02-29");
  });
  it("chaque année, et passage d'année", () => {
    expect(nextDueDate("2026-11-15", "year", 15)).toBe("2027-11-15");
    expect(nextDueDate("2028-02-29", "year", 29)).toBe("2029-02-28");
    expect(nextDueDate("2026-12-05", "month", 5)).toBe("2027-01-05");
  });
});

describe("sections et reste à payer", () => {
  const today = "2026-10-26";
  const bills = [
    bill("Électricité", "2026-10-28", 7200),
    bill("Assurance", "2026-10-30", 1850),
    bill("Plombier", "2026-10-31", 14000, { kind: "once", every: undefined }),
    bill("Retard", "2026-10-10", 1000),
    bill("Loyer", "2026-11-05", 115000),
    bill("Taxe", "2027-02-15", 50000, { every: "year" }),
    bill("Déjà payée", "2026-10-20", 999, { kind: "once", paid: true }),
  ];

  it("reste à payer d'ici la fin du mois, retards compris", () => {
    const s = billSections(bills, today);
    expect(s.thisMonth.map((b) => b.id)).toEqual(["Retard", "Électricité", "Assurance", "Plombier"]);
    expect(s.remainingCents).toBe(7200 + 1850 + 14000 + 1000);
    expect(s.nextMonth.map((b) => b.id)).toEqual(["Loyer"]);
    expect(s.later.map((b) => b.id)).toEqual(["Taxe"]);
  });
  it("en retard", () => {
    expect(isOverdue(bills[3], today)).toBe(true);
    expect(isOverdue(bills[0], today)).toBe(false);
    expect(isOverdue(bills[6], today)).toBe(false);
  });
});

describe("prélèvement automatique", () => {
  it("rien avant l'échéance", () => {
    expect(autoPayments(bill("loyer", "2026-11-05", 80000), "2026-11-04")).toEqual({ dates: [], nextDue: "2026-11-05", paid: false });
  });
  it("le jour de l'échéance : payée, échéance suivante", () => {
    expect(autoPayments(bill("loyer", "2026-11-05", 80000), "2026-11-05")).toEqual({ dates: ["2026-11-05"], nextDue: "2026-12-05", paid: false });
  });
  it("rattrape les mois manqués, en gardant le jour d'origine", () => {
    const b = bill("tel", "2027-01-31", 2000);
    expect(autoPayments(b, "2027-03-31")).toEqual({ dates: ["2027-01-31", "2027-02-28", "2027-03-31"], nextDue: "2027-04-30", paid: false });
  });
  it("ponctuelle : payée une fois", () => {
    expect(autoPayments(bill("taxe", "2026-10-15", 50000, { kind: "once", every: undefined }), "2026-11-01")).toEqual({
      dates: ["2026-10-15"],
      nextDue: "2026-10-15",
      paid: true,
    });
  });
  it("une facture en prélèvement n'est jamais en retard", () => {
    expect(isOverdue({ dueDate: "2026-10-01", paid: false, autoPay: true }, "2026-11-01")).toBe(false);
  });
});
