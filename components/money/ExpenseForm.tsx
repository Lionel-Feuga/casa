"use client";

import { useState } from "react";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { useSession } from "@/components/Providers";
import { useMoneyActions, type Expense } from "@/lib/client/money";
import { dayInParis, isDay } from "@/lib/domain/dates";
import { centsToInput, describeExpense, parseAmount, type Payer, type Scope } from "@/lib/domain/money";
import { CategoryPicker } from "./CategoryPicker";
import { Segmented } from "./Segmented";

const LABEL_MAX = 60;

// Formulaire « Nouvelle dépense », aussi utilisé pour modifier (section 5.1).
export function ExpenseForm({ expense, defaultScope = "shared", onDone }: { expense?: Expense; defaultScope?: Scope; onDone: () => void }) {
  const { profile } = useSession();
  const me = profile ?? "lionel";
  const { saveExpense, deleteExpense } = useMoneyActions();

  const [amount, setAmount] = useState(expense ? centsToInput(expense.amountCents) : "");
  const [label, setLabel] = useState(expense?.label ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null);
  const [scope, setScope] = useState<Scope>(expense?.scope ?? defaultScope);
  const [paidBy, setPaidBy] = useState<Payer>(expense?.paidBy ?? me);
  const [day, setDay] = useState(expense?.date ?? dayInParis());
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const amountCents = parseAmount(amount);
  const fromBill = expense?.source === "bill";

  const submit = () => {
    if (!amountCents) return setError("Montant invalide : un nombre positif, 2 décimales au plus, 99 999,99 € maximum.");
    if (!label.trim()) return setError("Indique ce que c’est.");
    if (!categoryId) return setError("Choisis une catégorie.");
    if (!isDay(day)) return setError("Date invalide.");
    setError(null);
    saveExpense.mutate(
      {
        id: expense?.id,
        input: { amountCents, label: label.trim(), categoryId, scope, paidBy: scope === "personal" ? me : paidBy, date: day, source: expense?.source === "ticket" ? "ticket" : undefined },
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
            aria-label="Montant en euros"
            autoFocus={!expense}
            enterKeyHint="done"
          />
          <span aria-hidden="true">€</span>
        </label>

        <div className="field">
          <label htmlFor="quoi">Quoi</label>
          <input id="quoi" className="inp" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={LABEL_MAX} placeholder="Pizzeria, électricité…" />
        </div>

        <div className="field">
          <span>Catégorie</span>
          <CategoryPicker value={categoryId} onChange={setCategoryId} />
        </div>

        {!fromBill && (
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
        )}

        {scope === "shared" && (
          <div className="field">
            <span>Payé par</span>
            <Segmented<Payer>
              label="Payé par"
              value={paidBy}
              onChange={setPaidBy}
              options={[
                { value: "lionel", label: "Lionel" },
                { value: "jaz", label: "Jaz" },
                // « Les deux » (chacun sa part) n'existe que pour une facture commune.
                ...(fromBill ? [{ value: "both" as const, label: "Les deux" }] : []),
              ]}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" className="inp" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>

        <p className="calc">
          {describeExpense({ amountCents, scope, paidBy }).map((line, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {line}
            </span>
          ))}
        </p>

        {error && (
          <p className="ferr" role="alert">
            {error}
          </p>
        )}

        {expense && (
          <button type="button" className="linkbtn" onClick={() => setConfirmDelete(true)}>
            Supprimer cette dépense
          </button>
        )}

        <div className="save solo">
          <button type="submit" className="btn go" disabled={saveExpense.isPending}>
            Enregistrer
          </button>
        </div>
      </form>

      {confirmDelete && expense && (
        <ConfirmSheet
          title="Supprimer cette dépense ?"
          text={fromBill ? "La facture liée revient à son échéance d’avant." : "Elle disparaît des Comptes et des Budgets."}
          confirmLabel="Supprimer"
          onConfirm={() => deleteExpense.mutate(expense.id, { onSuccess: onDone })}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
