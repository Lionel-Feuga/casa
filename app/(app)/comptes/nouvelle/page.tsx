"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { ExpenseForm } from "@/components/money/ExpenseForm";
import { useExpense } from "@/lib/client/money";

// /comptes/nouvelle : nouvelle dépense ; ?id=… pour modifier ; ?pour=moi pour une dépense perso (depuis Budgets).
function NouvelleDepense() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { data: expense, isPending, isError } = useExpense(id);
  const close = () => (window.history.length > 1 ? router.back() : router.replace("/comptes"));

  return (
    <div className="app">
      <header className="fhead">
        <h1>{id ? "Modifier la dépense" : "Nouvelle dépense"}</h1>
        <button type="button" className="fx" onClick={close} aria-label="Fermer">
          <Icon name="x" />
        </button>
      </header>
      {id && isPending ? null : id && (isError || !expense) ? (
        <div className="content">
          <div className="card empty">
            <p>Cette dépense n’existe plus.</p>
          </div>
        </div>
      ) : (
        <ExpenseForm key={expense?.id ?? "new"} expense={expense} defaultScope={params.get("pour") === "moi" ? "personal" : "shared"} onDone={close} />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <NouvelleDepense />
    </Suspense>
  );
}
