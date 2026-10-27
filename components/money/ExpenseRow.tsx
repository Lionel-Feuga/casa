"use client";

import { useRouter } from "next/navigation";
import { CategoryIcon } from "@/components/CategoryIcon";
import type { Expense } from "@/lib/client/money";
import type { Category } from "@/lib/domain/categories";
import { formatEuros } from "@/lib/domain/money";

// Ligne de dépense (icône, libellé, sous-titre, montant) ; toucher ouvre le formulaire en modification.
export function ExpenseRow({
  expense,
  category,
  subtitle,
  amountCents = expense.amountCents,
  note,
}: {
  expense: Expense;
  category?: Category;
  subtitle: string;
  amountCents?: number;
  note?: string;
}) {
  const router = useRouter();
  return (
    <li>
      <button type="button" className="er" onClick={() => router.push(`/comptes/nouvelle?id=${expense.id}`)}>
        <span className="eico">
          <CategoryIcon category={category} />
        </span>
        <span className="et">
          <b>{expense.label}</b>
          <small>{subtitle}</small>
        </span>
        <span className="ea">
          <b>{formatEuros(amountCents)}</b>
          {note && <small>{note}</small>}
        </span>
      </button>
    </li>
  );
}
