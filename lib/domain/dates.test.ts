import { describe, expect, it } from "vitest";
import { addMonths, dayInParis, dayLabel, monthLabel, monthRange, shortDay } from "./dates";

describe("dates", () => {
  it("jour à Paris, y compris près de minuit UTC", () => {
    expect(dayInParis(new Date("2026-10-26T23:30:00Z"))).toBe("2026-10-27"); // 0 h 30 à Paris (heure d'hiver)
    expect(dayInParis(new Date("2026-07-14T22:30:00Z"))).toBe("2026-07-15"); // 0 h 30 à Paris (heure d'été)
  });
  it("mois suivants et précédents", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
  it("bornes d'un mois", () => {
    const r = monthRange("2026-02");
    expect(r.start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
  it("libellés", () => {
    const now = new Date("2026-10-26T10:00:00Z");
    expect(monthLabel("2026-10", now)).toBe("Octobre");
    expect(monthLabel("2025-12", now)).toBe("Décembre 2025");
    expect(shortDay("2026-11-01")).toBe("1er nov.");
    expect(dayLabel("2026-10-26", now)).toBe("Aujourd’hui, 26 oct.");
    expect(dayLabel("2026-10-25", now)).toBe("Hier, 25 oct.");
    expect(dayLabel("2026-10-22", now)).toBe("22 oct.");
  });
});
