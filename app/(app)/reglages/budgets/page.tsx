"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Segmented } from "@/components/money/Segmented";
import { Screen } from "@/components/Screen";
import { useBudgetMode, useBudgetMonth, useSetLimit, type BudgetMode } from "@/lib/client/budgets";
import { useCategories } from "@/lib/client/money";
import type { Category } from "@/lib/domain/categories";
import { currentMonth } from "@/lib/domain/dates";
import { centsToInput, parseAmount } from "@/lib/domain/money";

// Un plafond par catégorie, ou rien pour « sans plafond ». Enregistré en quittant le champ.
function LimitRow({ category, mode, limitCents }: { category: Category; mode: BudgetMode; limitCents: number | null }) {
  const setLimit = useSetLimit();
  const initial = limitCents === null ? "" : centsToInput(limitCents).replace(/,00$/, "");
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"" | "ok" | "err">("");
  useEffect(() => setValue(initial), [initial]);

  const commit = () => {
    const trimmed = value.trim();
    const next = trimmed ? parseAmount(trimmed) : null;
    if (trimmed && next === null) return setState("err");
    if (next === limitCents) return setState("");
    setLimit.mutate({ mode, categoryId: category.id, limitCents: next }, { onSuccess: () => setState("ok"), onError: () => setState("err") });
  };

  return (
    <li className="lrow">
      <span className="eico">
        <CategoryIcon category={category} size={18} />
      </span>
      <b>{category.name}</b>
      <label>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/[^\d.,\s]/g, ""));
            setState("");
          }}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          inputMode="decimal"
          placeholder="sans plafond"
          aria-label={`Plafond mensuel ${category.name}`}
          aria-invalid={state === "err"}
        />
        €
      </label>
      <span className="saved" aria-live="polite">
        {state === "ok" ? "✓" : state === "err" ? "!" : ""}
      </span>
    </li>
  );
}

export default function LimitsPage() {
  const [mode, setMode] = useBudgetMode();
  const { data: categories = [] } = useCategories();
  const { data } = useBudgetMonth(currentMonth(), mode);
  const limits = new Map(data?.lines.map((l) => [l.categoryId, l.limitCents]));

  return (
    <Screen
      title="Plafonds"
      left={
        <Link href="/budgets" className="back">
          <ChevronLeft size={20} strokeWidth={2.6} aria-hidden="true" />
          Budgets
        </Link>
      }
    >
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
      <p className="meta">Plafond mensuel, le même chaque mois. Laisse vide pour « sans plafond ».</p>
      {data && (
        <ul className="clist">
          {categories.map((c) => (
            <LimitRow key={`${mode}-${c.id}`} category={c} mode={mode} limitCents={limits.get(c.id) ?? null} />
          ))}
        </ul>
      )}
    </Screen>
  );
}
