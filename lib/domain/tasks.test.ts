import { describe, expect, it } from "vitest";
import { DONE_VISIBLE_MS, doneLabel, dueLabel, isLate, isVisible, taskSections, type Task } from "./tasks";

const now = new Date("2026-10-26T10:00:00Z"); // lundi 26 octobre, Paris
const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, assignee: "both", done: false, createdAt: `2026-10-01T00:00:0${id.length % 10}Z`, ...extra });
const doneAt = (iso: string, by: Task["doneBy"] = "jaz"): Partial<Task> => ({
  done: true,
  doneAt: iso,
  doneBy: by,
  expireAt: new Date(new Date(iso).getTime() + DONE_VISIBLE_MS).toISOString(),
});

describe("sections", () => {
  const tasks = [
    task("verre", { dueDate: "2026-10-29", assignee: "lionel" }),
    task("syndic", { dueDate: "2026-10-20", assignee: "jaz" }),
    task("etagere", { dueDate: "2026-11-02" }),
    task("cave", { dueDate: "2026-11-15" }),
    task("ampoule", { assignee: "lionel" }),
    task("plantes", doneAt("2026-10-25T18:00:00Z")),
  ];

  it("cette semaine (retards compris), plus tard, quand on peut, fait", () => {
    const s = taskSections(tasks, "all", now);
    expect(s.week.map((t) => t.id)).toEqual(["syndic", "verre", "etagere"]);
    expect(s.later.map((t) => t.id)).toEqual(["cave"]);
    expect(s.whenever.map((t) => t.id)).toEqual(["ampoule"]);
    expect(s.done.map((t) => t.id)).toEqual(["plantes"]);
  });
  it("filtres Lionel, Jaz, Les deux", () => {
    expect(Object.values(taskSections(tasks, "lionel", now)).flat().map((t) => t.id)).toEqual(["verre", "ampoule"]);
    expect(Object.values(taskSections(tasks, "jaz", now)).flat().map((t) => t.id)).toEqual(["syndic"]);
    expect(taskSections(tasks, "both", now).week.map((t) => t.id)).toEqual(["etagere"]);
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
