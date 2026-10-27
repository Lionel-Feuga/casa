import { describe, expect, it } from "vitest";
import { normalizeName } from "./normalize";

describe("normalizeName", () => {
  it("retire accents, majuscules et espaces en trop", () => {
    expect(normalizeName("  Crème   Fraîche ")).toBe("creme fraiche");
  });
  it("traite œ et æ", () => {
    expect(normalizeName("Œufs")).toBe("oeufs");
    expect(normalizeName("Cæsar")).toBe("caesar");
    expect(normalizeName("Œufs").startsWith(normalizeName("oeu"))).toBe(true);
  });
});
