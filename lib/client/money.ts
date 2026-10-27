"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Category } from "@/lib/domain/categories";
import type { Month } from "@/lib/domain/dates";
import type { BalanceView, Expense, ExpenseInput, Settlement } from "@/lib/money/server";
import { api } from "./api";

export type { BalanceView, Expense, ExpenseInput, Settlement };

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api<{ categories: Category[] }>("/categories")).categories,
    staleTime: 5 * 60_000,
  });
}

export function useBalance() {
  return useQuery({ queryKey: ["expenses", "balance"], queryFn: () => api<BalanceView>("/balance") });
}

export type LedgerEntry = { kind: "expense"; expense: Expense } | { kind: "settlement"; settlement: Settlement };

/** Dépenses communes et règlements d'un mois, du plus récent au plus ancien (écran Comptes). */
export function useLedger(month: Month) {
  return useQuery({
    queryKey: ["expenses", "ledger", month],
    queryFn: async (): Promise<LedgerEntry[]> => {
      const [e, s] = await Promise.all([
        api<{ expenses: Expense[] }>(`/expenses?month=${month}&scope=shared`),
        api<{ settlements: Settlement[] }>(`/settlements?month=${month}`),
      ]);
      const entries: (LedgerEntry & { sortKey: string })[] = [
        ...e.expenses.map((x) => ({ kind: "expense" as const, expense: x, sortKey: x.date + x.createdAt })),
        ...s.settlements.map((x) => ({ kind: "settlement" as const, settlement: x, sortKey: x.date + x.createdAt })),
      ];
      return entries.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
    },
  });
}

export function useExpense(id: string | null) {
  return useQuery({
    queryKey: ["expenses", "one", id],
    queryFn: async () => (await api<{ expense: Expense }>(`/expenses/${id}`)).expense,
    enabled: !!id,
  });
}

export function useMoneyActions() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["expenses"] });
    void qc.invalidateQueries({ queryKey: ["settlements"] });
    void qc.invalidateQueries({ queryKey: ["budgets"] });
  };

  const saveExpense = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: ExpenseInput }) =>
      id
        ? api<{ expense: Expense }>(`/expenses/${id}`, { method: "PATCH", body: JSON.stringify(input) })
        : api<{ expense: Expense }>("/expenses", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: refresh,
  });

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });

  const settle = useMutation({ mutationFn: () => api("/settlements", { method: "POST" }), onSuccess: refresh });

  const deleteSettlement = useMutation({
    mutationFn: (id: string) => api(`/settlements/${id}`, { method: "DELETE" }),
    onSuccess: refresh,
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => (await api<{ category: Category }>("/categories", { method: "POST", body: JSON.stringify({ name }) })).category,
    onSuccess: (c) => {
      qc.setQueryData<Category[]>(["categories"], (old) => (old?.some((x) => x.id === c.id) ? old : [...(old ?? []), c]));
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api(`/categories/${id}`, { method: "DELETE" }),
    onMutate: (id) => qc.setQueryData<Category[]>(["categories"], (old) => old?.filter((c) => c.id !== id)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      refresh();
    },
  });

  return { saveExpense, deleteExpense, settle, deleteSettlement, createCategory, deleteCategory };
}
