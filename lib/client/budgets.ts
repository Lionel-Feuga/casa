"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { BudgetMonth } from "@/lib/budgets/server";
import type { Month } from "@/lib/domain/dates";
import { api } from "./api";
import type { Expense } from "./money";
import { readLocal, writeLocal } from "./storage";

export type { BudgetMonth };
export type BudgetMode = "shared" | "me";

const MODE_KEY = "casa.budgets.view";

/** Bascule Commun / Mon perso, mémorisée sur le téléphone (section 6.1). */
export function useBudgetMode(): [BudgetMode, (m: BudgetMode) => void] {
  const [mode, setMode] = useState<BudgetMode>(() => (typeof window !== "undefined" && readLocal(MODE_KEY) === "me" ? "me" : "shared"));
  return [
    mode,
    (m) => {
      writeLocal(MODE_KEY, m);
      setMode(m);
    },
  ];
}

export function useBudgetMonth(month: Month, mode: BudgetMode) {
  return useQuery({
    queryKey: ["budgets", month, mode],
    queryFn: () => api<BudgetMonth>(`/budgets?month=${month}&view=${mode}`),
  });
}

/** Dépenses du mois visibles par moi (communes + mes perso), pour les écrans de détail. */
export function useMonthExpenses(month: Month, scope?: "personal") {
  return useQuery({
    queryKey: ["expenses", "month", month, scope ?? "all"],
    queryFn: async () => (await api<{ expenses: Expense[] }>(`/expenses?month=${month}${scope ? `&scope=${scope}` : ""}`)).expenses,
  });
}

export function useSetLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { mode: BudgetMode; categoryId: string; limitCents: number | null }) =>
      api("/budgets", { method: "PUT", body: JSON.stringify({ view: v.mode, categoryId: v.categoryId, limitCents: v.limitCents }) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
