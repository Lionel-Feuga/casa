"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Icon } from "@/components/Icon";
import { CategoryPicker } from "@/components/money/CategoryPicker";
import { Segmented } from "@/components/money/Segmented";
import { useBill, useBillActions, type Bill } from "@/lib/client/bills";
import { useCategories } from "@/lib/client/money";
import { dayInParis, isDay } from "@/lib/domain/dates";
import { centsToInput, parseAmount } from "@/lib/domain/money";

type Freq = "month" | "year" | "once";

// Formulaire de facture (section 8.1) : libellé, montant, catégorie, échéance, type, pour qui.
function BillForm({ bill, onDone }: { bill?: Bill; onDone: () => void }) {
  const { data: categories = [] } = useCategories();
  const { saveBill, deleteBill } = useBillActions();
  const [label, setLabel] = useState(bill?.label ?? "");
  const [amount, setAmount] = useState(bill ? centsToInput(bill.amountCents) : "");
  const [categoryId, setCategoryId] = useState<string | null>(bill?.categoryId ?? null);
  const [due, setDue] = useState(bill?.dueDate ?? dayInParis());
  const [freq, setFreq] = useState<Freq>(bill ? (bill.kind === "once" ? "once" : (bill.every ?? "month")) : "month");
  const [scope, setScope] = useState<"shared" | "personal">(bill?.scope ?? "shared");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Factures par défaut (section 8.1)
  useEffect(() => {
    if (!categoryId) setCategoryId(categories.find((c) => c.key === "factures")?.id ?? null);
  }, [categories, categoryId]);

  const submit = () => {
    const amountCents = parseAmount(amount);
    if (!label.trim()) return setError("Indique le libellé (loyer, électricité…).");
    if (!amountCents) return setError("Montant invalide : un nombre positif, 2 décimales au plus.");
    if (!categoryId) return setError("Choisis une catégorie.");
    if (!isDay(due)) return setError("Échéance invalide.");
    setError(null);
    saveBill.mutate(
      {
        id: bill?.id,
        input: {
          label: label.trim(),
          amountCents,
          categoryId,
          scope,
          kind: freq === "once" ? "once" : "recurring",
          every: freq === "once" ? undefined : freq,
          dueDate: due,
        },
      },
      { onSuccess: onDone, onError: () => setError("Impossible d’enregistrer. Vérifie le réseau.") },
    );
  };

  return (
    <>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="amt">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ""))}
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Montant prévu en euros"
            autoFocus={!bill}
          />
          <span aria-hidden="true">€</span>
        </label>
        <div className="field">
          <label htmlFor="libelle">Libellé</label>
          <input id="libelle" className="inp" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="Loyer, électricité, internet…" />
        </div>
        <div className="field">
          <span>Catégorie</span>
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </div>
        <div className="field">
          <label htmlFor="echeance">Échéance</label>
          <input id="echeance" className="inp" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="field">
          <span>Type</span>
          <Segmented<Freq>
            label="Type"
            value={freq}
            onChange={setFreq}
            options={[
              { value: "month", label: "Chaque mois" },
              { value: "year", label: "Chaque année" },
              { value: "once", label: "Une fois" },
            ]}
          />
        </div>
        <div className="field">
          <span>Pour</span>
          <Segmented
            label="Pour"
            tone="tl"
            value={scope}
            onChange={setScope}
            options={[
              { value: "shared", label: "Tous les deux" },
              { value: "personal", label: "Juste moi" },
            ]}
          />
        </div>
        <p className="calc">
          {scope === "shared"
            ? "Commune : visible par vous deux. Une fois payée, elle devient une dépense commune."
            : "Perso : visible seulement par toi. Une fois payée, elle compte seulement dans ton budget."}
        </p>
        {error && (
          <p className="ferr" role="alert">
            {error}
          </p>
        )}
        {bill && (
          <button type="button" className="linkbtn" onClick={() => setConfirmDelete(true)}>
            Supprimer cette facture
          </button>
        )}
        <div className="save solo">
          <button type="submit" className="btn go" disabled={saveBill.isPending}>
            Enregistrer
          </button>
        </div>
      </form>
      {confirmDelete && bill && (
        <ConfirmSheet
          title="Supprimer cette facture ?"
          text="Les dépenses déjà créées en la payant sont gardées."
          confirmLabel="Supprimer"
          onConfirm={() => deleteBill.mutate(bill.id, { onSuccess: onDone })}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}

function FacturePage() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const { data: bill, isPending, isError } = useBill(id);
  const close = () => (window.history.length > 1 ? router.back() : router.replace("/a-payer"));

  return (
    <div className="app">
      <header className="fhead">
        <h1>{id ? "Modifier la facture" : "Nouvelle facture"}</h1>
        <button type="button" className="fx" onClick={close} aria-label="Fermer">
          <Icon name="x" />
        </button>
      </header>
      {id && isPending ? null : id && (isError || !bill) ? (
        <div className="content">
          <div className="card empty">
            <p>Cette facture n’existe plus.</p>
          </div>
        </div>
      ) : (
        <BillForm key={bill?.id ?? "new"} bill={bill} onDone={close} />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <FacturePage />
    </Suspense>
  );
}
