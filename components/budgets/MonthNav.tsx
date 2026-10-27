"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { daysLeft } from "@/lib/domain/budgets";
import { addMonths, currentMonth, dayInParis, isMonth, monthLabel, type Month } from "@/lib/domain/dates";

/** Mois demandé dans l'URL (?mois=AAAA-MM), le mois en cours sinon ; jamais dans le futur. */
export function monthFromParam(value: string | null): Month {
  const now = currentMonth();
  return value && isMonth(value) && value <= now ? value : now;
}

// « ‹ Octobre · encore 5 jours › » (section 6.1)
export function MonthNav({ month, onChange }: { month: Month; onChange: (m: Month) => void }) {
  const now = currentMonth();
  const left = daysLeft(dayInParis());
  const extra = month === now ? (left === 0 ? " · dernier jour" : ` · encore ${left} jour${left > 1 ? "s" : ""}`) : "";
  return (
    <span className="mnav">
      <button type="button" onClick={() => onChange(addMonths(month, -1))} aria-label="Mois précédent">
        <ChevronLeft size={22} strokeWidth={2.6} aria-hidden="true" />
      </button>
      <span className="meta" aria-live="polite">
        {monthLabel(month)}
        {extra}
      </span>
      <button type="button" onClick={() => onChange(addMonths(month, 1))} disabled={month >= now} aria-label="Mois suivant">
        <ChevronRight size={22} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </span>
  );
}
