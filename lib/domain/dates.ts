// Dates calendaires (section 11) : un jour est stocké à midi UTC, ce qui tombe le même jour à Paris
// toute l'année. Les mois et « aujourd'hui » se calculent dans le fuseau Europe/Paris.

export const TZ = "Europe/Paris";

export type Day = string; // « 2026-10-22 »
export type Month = string; // « 2026-10 »

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export const isDay = (s: string): s is Day => DAY_RE.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));
export const isMonth = (s: string): s is Month => MONTH_RE.test(s) && Number(s.slice(5)) >= 1 && Number(s.slice(5)) <= 12;

/** Jour calendaire à Paris pour un instant donné. */
export function dayInParis(at: Date = new Date()): Day {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export const monthOf = (day: Day): Month => day.slice(0, 7);
export const currentMonth = (at: Date = new Date()): Month => monthOf(dayInParis(at));

export const dayToDate = (day: Day): Date => new Date(`${day}T12:00:00Z`);
export const dateToDay = (d: Date): Day => d.toISOString().slice(0, 10);

export function addMonths(month: Month, n: number): Month {
  const [y, m] = month.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Bornes [début, fin[ d'un mois, pour les requêtes sur les dates stockées à midi UTC. */
export function monthRange(month: Month): { start: Date; end: Date } {
  return { start: new Date(`${month}-01T00:00:00Z`), end: new Date(`${addMonths(month, 1)}-01T00:00:00Z`) };
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « Octobre », ou « Octobre 2025 » si ce n'est pas l'année en cours. */
export function monthLabel(month: Month, now: Date = new Date()): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1);
  return y === Number(currentMonth(now).slice(0, 4)) ? name : `${name} ${y}`;
}

/** « 22 oct. », « 1er nov. » */
export function shortDay(day: Day): string {
  const d = Number(day.slice(8));
  return `${d === 1 ? "1er" : d} ${MONTHS_SHORT[Number(day.slice(5, 7)) - 1]}`;
}

/** Libellé du champ date : « Aujourd'hui, 26 oct. », « Hier, 25 oct. » ou « 22 oct. ». */
export function dayLabel(day: Day, now: Date = new Date()): string {
  const today = dayInParis(now);
  const yesterday = dayInParis(new Date(dayToDate(today).getTime() - 86_400_000));
  if (day === today) return `Aujourd’hui, ${shortDay(day)}`;
  if (day === yesterday) return `Hier, ${shortDay(day)}`;
  return day.slice(0, 4) === today.slice(0, 4) ? shortDay(day) : `${shortDay(day)} ${day.slice(0, 4)}`;
}
