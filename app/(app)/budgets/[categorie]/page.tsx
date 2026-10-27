"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MonthNav, monthFromParam } from "@/components/budgets/MonthNav";
import { ExpenseRow } from "@/components/money/ExpenseRow";
import { useSession } from "@/components/Providers";
import { Screen } from "@/components/Screen";
import { useMonthExpenses } from "@/lib/client/budgets";
import { useCategories } from "@/lib/client/money";
import { countIn } from "@/lib/domain/budgets";
import { monthLabel, shortDay } from "@/lib/domain/dates";
import { formatEuros } from "@/lib/domain/money";
import { PROFILE_LABEL } from "@/lib/domain/profile";

// Détail d'une catégorie pour la vue affichée (section 6.4).
function CategoryDetail() {
  const router = useRouter();
  const { categorie } = useParams<{ categorie: string }>();
  const params = useSearchParams();
  const month = monthFromParam(params.get("mois"));
  const mode = params.get("vue") === "me" ? "me" : "shared";
  const { profile } = useSession();
  const me = profile ?? "lionel";
  const { data: categories = [] } = useCategories();
  const { data: expenses, isPending } = useMonthExpenses(month);
  const category = categories.find((c) => c.id === categorie);
  const view = mode === "me" ? me : "shared";

  const rows = (expenses ?? [])
    .filter((e) => e.categoryId === categorie)
    .map((e) => ({ e, c: countIn(e, view) }))
    .filter((x): x is { e: typeof x.e; c: NonNullable<typeof x.c> } => x.c !== null);
  const total = rows.reduce((s, r) => s + r.c.shared + r.c.personal, 0);

  return (
    <Screen
      title={category?.name ?? "Catégorie"}
      left={
        <Link href={`/budgets?mois=${month}`} className="back">
          <ChevronLeft size={20} strokeWidth={2.6} aria-hidden="true" />
          Budgets
        </Link>
      }
    >
      <MonthNav month={month} onChange={(m) => router.replace(`/budgets/${categorie}?mois=${m}&vue=${mode}`)} />
      <section className="btot">
        <div className="row">
          <b>{formatEuros(total)}</b>
          <span>{mode === "me" ? "dans mon perso" : "en commun"}</span>
        </div>
      </section>
      {isPending ? null : rows.length === 0 ? (
        <p className="mempty">Aucune dépense en {monthLabel(month).toLowerCase()}.</p>
      ) : (
        <ul className="elist">
          {rows.map(({ e, c }) => {
            const payer = e.paidBy === "both" ? "les deux" : PROFILE_LABEL[e.paidBy];
            const isShare = mode === "me" && e.scope === "shared";
            return (
              <ExpenseRow
                key={e.id}
                expense={e}
                category={category}
                subtitle={e.scope === "personal" ? `perso · ${shortDay(e.date)}` : `payé par ${payer} · ${shortDay(e.date)}`}
                amountCents={c.shared + c.personal}
                note={isShare ? `part commune de ${formatEuros(e.amountCents)}` : undefined}
              />
            );
          })}
        </ul>
      )}
    </Screen>
  );
}

export default function Page() {
  return (
    <Suspense>
      <CategoryDetail />
    </Suspense>
  );
}
