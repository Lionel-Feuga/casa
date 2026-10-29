import { dayInParis, dayToDate, shortDay, type Day } from "./dates";
import { PROFILE_LABEL, type Profile } from "./profile";

// Tâches de l'appartement (section 7). Fonctions pures.

export type Assignee = Profile | "both";

export const DONE_VISIBLE_MS = 7 * 24 * 3600 * 1000;
export const TASK_TITLE_MAX = 80;

export interface Task {
  id: string;
  title: string;
  assignee: Assignee;
  dueDate?: Day;
  done: boolean;
  doneAt?: string;
  doneBy?: Profile;
  expireAt?: string;
  /** Catégorie de tâches, absente pour « Sans catégorie ». */
  categoryId?: string;
  /** Ordre choisi à la main dans la catégorie (index fractionnaire, comme les courses). */
  position: string;
  createdAt: string;
}

export interface TaskCategory {
  id: string;
  name: string;
  position: string;
}

export const TASK_CATEGORY_NAME_MAX = 30;
export const NO_CATEGORY = "none";

export type TaskFilter = "all" | Assignee;

const DAY_MS = 86_400_000;
const daysBetween = (from: Day, to: Day) => Math.round((dayToDate(to).getTime() - dayToDate(from).getTime()) / DAY_MS);

/** Une tâche faite reste visible 7 jours : elle disparaît dès expireAt, même si l'index TTL n'est pas encore passé. */
export const isVisible = (t: Task, now: Date): boolean => !t.done || !t.expireAt || new Date(t.expireAt) > now;

export interface TaskGroup {
  /** Identifiant de la catégorie, ou NO_CATEGORY pour « Sans catégorie ». */
  id: string;
  name: string;
  tone: "pk" | "bl" | "tl" | "ink";
  tasks: Task[];
}

const TONES = ["pk", "bl", "tl"] as const;
const byPosition = <T extends { position: string; id: string }>(a: T, b: T) =>
  a.position !== b.position ? (a.position < b.position ? -1 : 1) : a.id < b.id ? -1 : 1;

/**
 * Tâches rangées par catégorie, dans l'ordre choisi à la main ; « Sans catégorie » en dernier.
 * Dans chaque catégorie, les tâches faites (visibles 7 jours) passent sous les autres.
 */
export function groupTasks(tasks: Task[], categories: TaskCategory[], filter: TaskFilter, now: Date): TaskGroup[] {
  const known = new Set(categories.map((c) => c.id));
  const list = tasks.filter((t) => isVisible(t, now) && (filter === "all" || t.assignee === filter));
  const inGroup = (id: string) => {
    const mine = list.filter((t) => (id === NO_CATEGORY ? !t.categoryId || !known.has(t.categoryId) : t.categoryId === id));
    return [...mine.filter((t) => !t.done).sort(byPosition), ...mine.filter((t) => t.done).sort(byPosition)];
  };
  const groups: TaskGroup[] = [...categories].sort(byPosition).map((c, i) => ({ id: c.id, name: c.name, tone: TONES[i % TONES.length], tasks: inGroup(c.id) }));
  const loose = inGroup(NO_CATEGORY);
  // « Sans catégorie » n'apparaît que s'il contient des tâches, ou s'il n'y a encore aucune catégorie.
  if (loose.length || groups.length === 0) groups.push({ id: NO_CATEGORY, name: "Sans catégorie", tone: "ink", tasks: loose });
  return groups;
}

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const WEEKDAYS_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const weekday = (day: Day) => dayToDate(day).getUTCDay();

/** « mer. 29 oct. » */
export const dueLabel = (day: Day): string => `${WEEKDAYS_SHORT[weekday(day)]} ${shortDay(day)}`;

export const isLate = (t: Task, now: Date): boolean => !t.done && !!t.dueDate && t.dueDate < dayInParis(now);

/** « fait hier par Jaz · visible encore 6 j » */
export function doneLabel(t: Task, now: Date): string {
  if (!t.doneAt) return "fait";
  const done = dayInParis(new Date(t.doneAt));
  const ago = daysBetween(done, dayInParis(now));
  const when = ago <= 0 ? "aujourd’hui" : ago === 1 ? "hier" : WEEKDAYS[weekday(done)];
  const by = t.doneBy ? ` par ${PROFILE_LABEL[t.doneBy]}` : "";
  // En jours du calendrier : faite hier, encore 6 jours.
  const left = Math.max(1, 7 - ago);
  return `fait ${when}${by} · visible encore ${left} j`;
}
