import { describe, expect, it } from "vitest";
import { cleanName, findDuplicate, positionAtEnd, positionForMove, rankSuggestions, sortItems, type ShoppingItem, type Suggestion } from "./shopping";

const item = (id: string, name: string, position: string, checked = false): ShoppingItem => ({
  id,
  name,
  position,
  checked,
  addedBy: "lionel",
  createdAt: "2026-10-27T10:00:00Z",
});

const sugg = (label: string, count: number, lastAddedAt = "2026-10-01T00:00:00Z"): Suggestion => ({
  key: label
    .toLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""),
  label,
  count,
  lastAddedAt,
});

describe("cleanName", () => {
  it("retire les espaces en trop, vide si seulement des espaces", () => {
    expect(cleanName("  Œufs   x12 ")).toBe("Œufs x12");
    expect(cleanName("   ")).toBe("");
  });
});

describe("doublons", () => {
  const items = [item("a", "Tomates", "a0"), item("b", "Œufs", "a1", true)];
  it("trouve un article au nom normalisé identique", () => {
    expect(findDuplicate(items, "  tomates ")?.id).toBe("a");
    expect(findDuplicate(items, "oeufs")?.id).toBe("b");
    expect(findDuplicate(items, "Tortillas")).toBeUndefined();
  });
  it("préfère l'article non coché", () => {
    const both = [item("x", "Lait", "a0", true), item("y", "lait", "a1")];
    expect(findDuplicate(both, "Lait")?.id).toBe("y");
  });
});

describe("positions", () => {
  it("ajoute en bas de la liste", () => {
    const items = [item("a", "A", "a0"), item("b", "B", "a1")];
    const p = positionAtEnd(items);
    expect(p > "a1").toBe(true);
    expect(positionAtEnd([])).toBeTruthy();
  });
  it("déplace un article entre ses nouveaux voisins", () => {
    const sorted = sortItems([item("a", "A", "a0"), item("b", "B", "a1"), item("c", "C", "a2"), item("d", "D", "a3")]);
    // D (index 3) en tête
    const top = positionForMove(sorted, 3, 0);
    expect(top < "a0").toBe(true);
    // A (index 0) entre C et D
    const mid = positionForMove(sorted, 0, 2);
    expect(mid > "a2" && mid < "a3").toBe(true);
    // B tout en bas
    expect(positionForMove(sorted, 1, 3) > "a3").toBe(true);
  });
});

describe("suggestions", () => {
  const history = [sugg("Tortillas", 2), sugg("Tomates", 25), sugg("Tofu", 4), sugg("Œufs", 12), sugg("Tomates cerises", 9)];

  it("« to » affiche Tomates avant Tortillas", () => {
    const r = rankSuggestions(history, "to", []).map((s) => s.label);
    expect(r).toEqual(["Tomates", "Tomates cerises", "Tofu", "Tortillas"]);
  });
  it("« oeu » trouve Œufs, sans accents ni majuscules", () => {
    expect(rankSuggestions(history, "OEU", []).map((s) => s.label)).toEqual(["Œufs"]);
  });
  it("ne suggère pas un article présent et non coché, mais bien s'il est coché", () => {
    expect(rankSuggestions(history, "tom", [item("a", "Tomates", "a0")]).map((s) => s.label)).toEqual(["Tomates cerises"]);
    expect(rankSuggestions(history, "tom", [item("a", "Tomates", "a0", true)]).map((s) => s.label)).toEqual(["Tomates", "Tomates cerises"]);
  });
  it("5 au maximum, égalité départagée par le dernier ajout", () => {
    const many = Array.from({ length: 8 }, (_, i) => sugg(`Pain ${i}`, 1, `2026-10-0${i + 1}T00:00:00Z`));
    const r = rankSuggestions(many, "pain", []);
    expect(r).toHaveLength(5);
    expect(r[0].label).toBe("Pain 7");
  });
  it("rien pour une saisie vide", () => {
    expect(rankSuggestions(history, "  ", [])).toEqual([]);
  });
});
