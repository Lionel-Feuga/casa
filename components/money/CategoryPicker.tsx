"use client";

import { useState } from "react";
import { useCategories, useMoneyActions } from "@/lib/client/money";

// Pastilles de catégorie + « Autre » qui crée une catégorie réutilisable (section 4).
export function CategoryPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const { data: categories = [] } = useCategories();
  const { createCategory } = useMoneyActions();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const create = () => {
    if (!name.trim()) return;
    createCategory.mutate(name, {
      onSuccess: (c) => {
        onChange(c.id);
        setAdding(false);
        setName("");
      },
    });
  };

  return (
    <>
      <div className="chips" role="group" aria-label="Catégorie">
        {categories.map((c) => (
          <button key={c.id} type="button" className="chip" aria-pressed={value === c.id} onClick={() => onChange(c.id)}>
            {c.name}
          </button>
        ))}
        <button type="button" className="chip add2" aria-pressed={adding} onClick={() => setAdding((a) => !a)}>
          + Autre
        </button>
      </div>
      {adding && (
        <div className="other">
          <input
            className="inp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
            }}
            placeholder="Nouvelle catégorie"
            aria-label="Nom de la nouvelle catégorie"
            maxLength={30}
            autoFocus
          />
          <button type="button" className="btn" onClick={create} disabled={createCategory.isPending || !name.trim()}>
            Créer
          </button>
        </div>
      )}
    </>
  );
}
