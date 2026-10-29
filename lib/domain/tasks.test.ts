import { describe, expect, it } from "vitest";
import { DONE_VISIBLE_MS, doneLabel, dueLabel, groupTasks, isLate, isVisible, NO_CATEGORY, type Task, type TaskCategory } from "./tasks";

const now = new Date("2026-10-26T10:00:00Z"); // lundi 26 octobre, Paris
const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, assignee: "both", done: false, position: "a0", createdAt: `2026-10-01T00:00:0${id.length % 10}Z`, ...extra });
const doneAt = (iso: string, by: Task["doneBy"] = "jaz"): Partial<Task> => ({
  done: true,
  doneAt: iso,
  doneBy: by,
  expireAt: new Date(new Date(iso).getTime() + DONE_VISIBLE_MS).toISOString(),
});

describe("catégories", () => {
  const cats: TaskCategory[] = [
    { id: "bricolage", name: "Bricolage", position: "a1" },
    { id: "menage", name: "Ménage", position: "a0" },
  ];
  const tasks = [
    task("verre", { categoryId: "menage", position: "a1", assignee: "lionel" }),
    task("poubelles", { categoryId: "menage", position: "a0", assignee: "jaz" }),
    task("plantes", { categoryId: "menage", position: "Zz", ...doneAt("2026-10-25T18:00:00Z") }),
    task("etagere", { categoryId: "bricolage", position: "a0" }),
    task("syndic", { position: "a0", assignee: "jaz" }),
    task("perdue", { categoryId: "supprimee", position: "a1" }),
  ];

  it("rangées par catégorie et à la main, les faites en bas, Sans catégorie en dernier", () => {
    const g = groupTasks(tasks, cats, "all", now);
    expect(g.map((x) => x.name)).toEqual(["Ménage", "Bricolage", "Sans catégorie"]);
    expect(g[0].tasks.map((t) => t.id)).toEqual(["poubelles", "verre", "plantes"]);
    expect(g[2]).toMatchObject({ id: NO_CATEGORY, tone: "ink" });
    expect(g[2].tasks.map((t) => t.id)).toEqual(["syndic", "perdue"]);
  });
  it("filtres Lionel, Jaz, Les deux ; une catégorie vide reste affichée", () => {
    const jaz = groupTasks(tasks, cats, "jaz", now);
    expect(jaz.map((x) => x.tasks.map((t) => t.id))).toEqual([["poubelles"], [], ["syndic"]]);
    const lionel = groupTasks(tasks, cats, "lionel", now);
    expect(lionel.map((x) => x.name)).toEqual(["Ménage", "Bricolage"]);
  });
  it("sans aucune catégorie, un seul bloc", () => {
    expect(groupTasks([], [], "all", now).map((x) => x.name)).toEqual(["Sans catégorie"]);
  });
});

describe("tâche faite visible 7 jours (section 15)", () => {
  const t = task("x", doneAt("2026-10-26T07:00:00Z")); // cochée lundi matin
  it("encore visible le dimanche suivant, disparue le lundi d'après", () => {
    expect(isVisible(t, new Date("2026-11-01T20:00:00Z"))).toBe(true);
    expect(isVisible(t, new Date("2026-11-02T08:00:00Z"))).toBe(false);
  });
  it("libellés", () => {
    expect(doneLabel(task("y", doneAt("2026-10-25T18:00:00Z")), now)).toBe("fait hier par Jaz · visible encore 6 j");
    expect(doneLabel(task("z", doneAt("2026-10-22T18:00:00Z", "lionel")), now)).toBe("fait jeudi par Lionel · visible encore 3 j");
    expect(dueLabel("2026-10-29")).toBe("jeu. 29 oct.");
    expect(dueLabel("2026-11-01")).toBe("dim. 1er nov.");
  });
  it("en retard", () => {
    expect(isLate(task("a", { dueDate: "2026-10-25" }), now)).toBe(true);
    expect(isLate(task("b", { dueDate: "2026-10-26" }), now)).toBe(false);
  });
});
