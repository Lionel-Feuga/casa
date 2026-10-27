"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MonthNav, monthFromParam } from "@/components/budgets/MonthNav";
import { ExpenseRow } from "@/components/money/ExpenseRow";
import { Screen } from "@/components/Screen";
import { useMonthExpenses } from "@/lib/client/budgets";
import { useCategories } from "@/lib/client/money";
import { monthLabel, shortDay } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";

// « Mes dépenses perso » (section 6.5) : visible seulement par son propriétaire, toutes catégories.
function PersonalExpenses() {
  const router = useRouter();
  const month = monthFromParam(useSearchParams().get("mois"));
  const { data: categories = [] } = useCategories();
  const { data: expenses, isPending } = useMonthExpenses(month, "personal");
  const byId = new Map(categories.map((c) => [c.id, c]));
  const total = (expenses ?? []).reduce((s, e) => s + e.amountCents, 0);

  return (
    <Screen
      title="Mes dépenses perso"
      left={
        <Link href={`/budgets?mois=${month}`} className="back">
          <ChevronLeft size={20} strokeWidth={2.6} aria-hidden="true" />
          Budgets
        </Link>
      }
    >
      <MonthNav month={month} onChange={(m) => router.replace(`/budgets/perso/depenses?mois=${m}`)} />
      <section className="btot">
        <div className="row">
          <b>{formatEuros(total)}</b>
          <span>en {monthLabel(month).toLowerCase()}</span>
        </div>
      </section>
      {isPending ? null : !expenses?.length ? (
        <p className="mempty">Aucune dépense perso en {monthLabel(month).toLowerCase()}.</p>
      ) : (
        <ul className="elist">
          {expenses.map((e) => {
            const cat = byId.get(e.categoryId);
            return <ExpenseRow key={e.id} expense={e} category={cat} subtitle={`${cat?.name ?? "Divers"} · ${shortDay(e.date)}`} />;
          })}
        </ul>
      )}
      <Link href="/comptes/nouvelle?pour=moi" className="fab light">
        + Dépense
      </Link>
    </Screen>
  );
}

export default function Page() {
  return (
    <Suspense>
      <PersonalExpenses />
    </Suspense>
  );
}
