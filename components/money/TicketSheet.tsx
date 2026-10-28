"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/Providers";
import { Sheet } from "@/components/Sheet";
import { useCategories, useMoneyActions } from "@/lib/client/money";
import { dayInParis } from "@/lib/domain/dates";
import { parseAmount, type Scope } from "@/lib/domain/money";
import type { Profile } from "@/lib/domain/profile";
import { CategoryPicker } from "./CategoryPicker";
import { Segmented } from "./Segmented";

// « Enregistrer le ticket ? » en quittant le mode magasin (section 3.7).
export function TicketSheet({ onClose }: { onClose: () => void }) {
  const { profile } = useSession();
  const me: Profile = profile ?? "lionel";
  const { data: categories = [] } = useCategories();
  const { saveExpense } = useMoneyActions();
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<Profile>(me);
  const [scope, setScope] = useState<Scope>("shared");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Courses par défaut, dès que la liste des catégories est là.
  useEffect(() => {
    if (!categoryId) setCategoryId(categories.find((c) => c.key === "courses")?.id ?? null);
  }, [categories, categoryId]);

  const save = () => {
    const amountCents = parseAmount(amount);
    if (!amountCents) return setError("Indique le montant du ticket.");
    if (!categoryId) return setError("Choisis une catégorie.");
    saveExpense.mutate(
      { input: { label: "Ticket de courses", amountCents, categoryId, scope, paidBy: scope === "personal" ? me : paidBy, date: dayInParis(), source: "ticket" } },
      { onSuccess: onClose, onError: () => setError("Impossible d’enregistrer. Vérifie le réseau.") },
    );
  };

  return (
    <Sheet title="Enregistrer le ticket ?" onClose={onClose}>
      <h3>Enregistrer le ticket ?</h3>
      <p className="note">Les articles cochés restent barrés dans la liste jusqu’à « Vider le panier ».</p>
      <label className="amt">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,\s]/g, ""))}
          inputMode="decimal"
          placeholder="0,00"
          aria-label="Montant du ticket en euros"
        />
        <span aria-hidden="true">€</span>
      </label>
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
      {scope === "shared" && (
        <div className="field">
          <span>Payé par</span>
          <Segmented
            label="Payé par"
            value={paidBy}
            onChange={setPaidBy}
            options={[
              { value: "lionel", label: "Lionel" },
              { value: "jaz", label: "Jaz" },
            ]}
          />
        </div>
      )}
      <div className="field">
        <span>Catégorie</span>
        <CategoryPicker value={categoryId} onChange={setCategoryId} />
      </div>
      {error && (
        <p className="ferr" role="alert">
          {error}
        </p>
      )}
      <div className="btn2">
        <button type="button" className="btn" onClick={onClose}>
          Pas maintenant
        </button>
        <button type="button" className="btn go" data-online-only onClick={save} disabled={saveExpense.isPending}>
          Enregistrer
        </button>
      </div>
    </Sheet>
  );
}
