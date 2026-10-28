"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BillInput } from "@/lib/bills/server";
import type { Bill } from "@/lib/domain/bills";
import type { Day } from "@/lib/domain/dates";
import type { Payer } from "@/lib/domain/money";
import { api } from "./api";

export type { Bill, BillInput };

export function useBills() {
  return useQuery({ queryKey: ["bills"], queryFn: async () => (await api<{ bills: Bill[] }>("/bills")).bills });
}

export function useBill(id: string | null) {
  return useQuery({
    queryKey: ["bills", "one", id],
    queryFn: async () => (await api<{ bill: Bill }>(`/bills/${id}`)).bill,
    enabled: !!id,
  });
}

export function useBillActions() {
  const qc = useQueryClient();
  const refresh = () => {
    for (const key of ["bills", "expenses", "budgets"]) void qc.invalidateQueries({ queryKey: [key] });
  };

  const saveBill = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: BillInput }) =>
      id ? api(`/bills/${id}`, { method: "PATCH", body: JSON.stringify(input) }) : api("/bills", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: refresh,
  });

  const deleteBill = useMutation({ mutationFn: (id: string) => api(`/bills/${id}`, { method: "DELETE" }), onSuccess: refresh });

  const payBill = useMutation({
    mutationFn: ({ id, ...body }: { id: string; amountCents: number; date: Day; paidBy: Payer }) =>
      api(`/bills/${id}/pay`, { method: "POST", body: JSON.stringify(body) }),
    // La facture quitte « À venir » tout de suite.
    onMutate: ({ id }) => qc.setQueryData<Bill[]>(["bills"], (old) => old?.filter((b) => b.id !== id)),
    onSettled: refresh,
  });

  return { saveBill, deleteBill, payBill };
}
