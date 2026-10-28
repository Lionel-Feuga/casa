"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MonthNav, monthFromParam } from "@/components/budgets/MonthNav";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Segmented } from "@/components/money/Segmented";
import { Screen } from "@/components/Screen";
import { useBudgetMode, useBudgetMonth, type BudgetMode } from "@/lib/client/budgets";
import { useCategories } from "@/lib/client/money";
import { overBy, type BudgetLine } from "@/lib/domain/budgets";
import { sortCategories } from "@/lib/domain/categories";
import { formatEuros } from "@/lib/domain/money";

/** Ligne de détail du perso : « 100 % part commune », « dont 25,00 € perso », « 100 % perso ». */
function persoDetail(l: BudgetLine): string | null {
  if (!l.spentCents) return null;
  if (!l.personalCents) return "100 % part commune";
  if (!l.sharedPartCents) return "100 % perso";
  return `dont ${formatEuros(l.personalCents)} perso`;
}

function BudgetsScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const month = monthFromParam(params.get("mois"));
  const [mode, setMode] = useBudgetMode();
  const { data } = useBudgetMonth(month, mode);
  const { data: categories = [] } = useCategories();
  const byId = new Map(categories.map((c) => [c.id, c]));
  const lines = data ? sortCategories(data.lines.map((l) => ({ ...l, ...(byId.get(l.categoryId) ?? { key: "", isDefault: false }) }))) : [];

  const go = (m: string) => router.replace(`/budgets?mois=${m}`);
  const detail = (id: string) => router.push(`/budgets/${id}?mois=${month}&vue=${mode}`);

  return (
    <Screen title="Budgets" left={<MonthNav month={month} onChange={go} />}>
      <Segmented<BudgetMode>
        label="Vue"
        tone="pk"
        value={mode}
        onChange={setMode}
        options={[
          { value: "shared", label: "Commun" },
          { value: "me", label: "Mon perso" },
        ]}
      />

      <section className="btot" aria-label="Total du mois">
        <div className="row">
          <b>{data ? formatEuros(data.totalCents) : "…"}</b>
          {mode === "shared" && <span>dépensés ensemble</span>}
        </div>
        <span className="slab">
          {mode === "shared"
            ? "Seulement les dépenses « Tous les deux »"
            : data
              ? `Ma part des dépenses communes (${formatEuros(data.sharedPartCents)}) + mes dépenses perso (${formatEuros(data.personalCents)})`
              : " "}
        </span>
        {mode === "me" && (
          <Link href={`/budgets/perso/depenses?mois=${month}`} className="btn">
            Mes dépenses perso
          </Link>
        )}
      </section>

      <ul className="blist">
        {lines.map((l) => {
          const cat = byId.get(l.categoryId);
          const over = overBy(l);
          const pct = l.limitCents ? Math.min(100, Math.round((l.spentCents / l.limitCents) * 100)) : 0;
          const sub = mode === "me" ? persoDetail(l) : null;
          return (
            <li key={l.categoryId}>
              <button type="button" className="bc" onClick={() => detail(l.categoryId)}>
                <span className="row">
                  <span className="eico">
                    <CategoryIcon category={cat} size={18} />
                  </span>
                  <b>{cat?.name ?? "Catégorie supprimée"}</b>
                  {l.limitCents !== null ? (
                    <span>
                      {formatEuros(l.spentCents)} / {formatEuros(l.limitCents)}
                    </span>
                  ) : (
                    <>
                      <span>{formatEuros(l.spentCents)}</span>
                      <em>sans plafond</em>
                    </>
                  )}
                </span>
                {l.limitCents !== null && (
                  <span className={`bar${over ? " over" : ""}`} aria-hidden="true">
                    <i style={{ width: `${pct}%` }} data-empty={pct === 0 ? "" : undefined} />
                  </span>
                )}
                {sub && <small>{sub}</small>}
                {over > 0 && <span className="over-note">{formatEuros(over)} au-dessus du budget</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <Link href={mode === "me" ? "/comptes/nouvelle?pour=moi" : "/comptes/nouvelle"} className="fab light" data-online-only>
        + Dépense
      </Link>
    </Screen>
  );
}

export default function BudgetsPage() {
  return (
    <Suspense>
      <BudgetsScreen />
    </Suspense>
  );
}
