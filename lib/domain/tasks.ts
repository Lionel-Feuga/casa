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
  createdAt: string;
}

export type TaskFilter = "all" | Assignee;

const DAY_MS = 86_400_000;
const daysBetween = (from: Day, to: Day) => Math.round((dayToDate(to).getTime() - dayToDate(from).getTime()) / DAY_MS);

/** Une tâche faite reste visible 7 jours : elle disparaît dès expireAt, même si l'index TTL n'est pas encore passé. */
export const isVisible = (t: Task, now: Date): boolean => !t.done || !t.expireAt || new Date(t.expireAt) > now;

export interface TaskSections {
  week: Task[];
  later: Task[];
  whenever: Task[];
  done: Task[];
}

/** « Cette semaine » : date dans les 7 prochains jours ou en retard ; « Plus tard » : au-delà ; « Quand on peut » : sans date. */
export function taskSections(tasks: Task[], filter: TaskFilter, now: Date): TaskSections {
  const today = dayInParis(now);
  const list = tasks.filter((t) => isVisible(t, now) && (filter === "all" || t.assignee === filter));
  const byDue = (a: Task, b: Task) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : a.createdAt < b.createdAt ? -1 : 1);
  const todo = list.filter((t) => !t.done);
  return {
    week: todo.filter((t) => t.dueDate && daysBetween(today, t.dueDate) <= 7).sort(byDue),
    later: todo.filter((t) => t.dueDate && daysBetween(today, t.dueDate) > 7).sort(byDue),
    whenever: todo.filter((t) => !t.dueDate).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    done: list.filter((t) => t.done).sort((a, b) => ((a.doneAt ?? "") < (b.doneAt ?? "") ? 1 : -1)),
  };
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
