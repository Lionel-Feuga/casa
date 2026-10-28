import { describe, expect, it } from "vitest";
import { billSections, isOverdue, nextDueDate, type Bill } from "./bills";

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
