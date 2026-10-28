"use client";

import { useState } from "react";
import { useSession } from "@/components/Providers";
import { Sheet } from "@/components/Sheet";
import { Segmented } from "@/components/money/Segmented";
import { useBillActions, type Bill } from "@/lib/client/bills";
import { dayInParis, isDay } from "@/lib/domain/dates";
import { centsToInput, describeExpense, parseAmount, type Payer } from "@/lib/domain/money";

// Feuille « Marquer payé » (section 8.2) : montant modifiable, date, et qui a payé pour une facture commune.
export function PaySheet({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const { profile } = useSession();
  const { payBill } = useBillActions();
  const [amount, setAmount] = useState(centsToInput(bill.amountCents));
  const [day, setDay] = useState(dayInParis());
  const [paidBy, setPaidBy] = useState<Payer>(profile ?? "lionel");
  const [error, setError] = useState<string | null>(null);
  const shared = bill.scope === "shared";
  const amountCents = parseAmount(amount);

  const save = () => {
    if (!amountCents) return setError("Montant invalide.");
    if (!isDay(day)) return setError("Date invalide.");
    payBill.mutate(
      { id: bill.id, amountCents, date: day, paidBy: shared ? paidBy : (profile ?? "lionel") },
      { onError: () => setError("Impossible d’enregistrer. Vérifie le réseau.") },
    );
    onClose();
  };

  return (
    <Sheet title={`Payer ${bill.label}`} onClose={onClose}>
      <h3>{bill.label}</h3>
      <p className="note">
        {shared ? "Crée une dépense commune dans la catégorie de la facture." : "Crée une dépense perso, seulement dans ton budget."}
      </p>
      <label className="amt">
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ""))} inputMode="decimal" aria-label="Montant payé en euros" />
        <span aria-hidden="true">€</span>
      </label>
      {shared && (
        <div className="field">
          <span>Qui a payé ?</span>
          <Segmented<Payer>
            label="Qui a payé ?"
            value={paidBy}
            onChange={setPaidBy}
            options={[
              { value: "lionel", label: "Lionel" },
              { value: "jaz", label: "Jaz" },
              { value: "both", label: "Les deux" },
            ]}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor="pay-date">Date</label>
        <input id="pay-date" className="inp" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      {shared && (
        <p className="calc">
          {describeExpense({ amountCents, scope: "shared", paidBy }).map((l, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {l}
            </span>
          ))}
        </p>
      )}
      {error && (
        <p className="ferr" role="alert">
          {error}
        </p>
      )}
      <div className="btn2">
        <button type="button" className="btn" onClick={onClose}>
          Annuler
        </button>
        <button type="button" className="btn go" onClick={save}>
          Marquer payé
        </button>
      </div>
    </Sheet>
  );
}
