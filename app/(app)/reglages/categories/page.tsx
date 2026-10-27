"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Screen } from "@/components/Screen";
import { useCategories, useMoneyActions } from "@/lib/client/money";
import type { Category } from "@/lib/domain/categories";

// Gestion des catégories (section 4) : seules les catégories créées via « Autre » se suppriment.
export default function CategoriesPage() {
  const { data: categories = [], isPending } = useCategories();
  const { deleteCategory } = useMoneyActions();
  const [removing, setRemoving] = useState<Category | null>(null);

  return (
    <Screen
      title="Catégories"
      left={
        <Link href="/comptes" className="back">
          <ChevronLeft size={20} strokeWidth={2.6} aria-hidden="true" />
          Comptes
        </Link>
      }
    >
      <p className="meta">Pour en créer une, choisis « + Autre » en ajoutant une dépense.</p>
      {!isPending && (
        <ul className="clist">
          {categories.map((c) => (
            <li key={c.id} className="crow">
              <span className="eico">
                <CategoryIcon category={c} />
              </span>
              <b>{c.name}</b>
              {c.isDefault ? (
                <em>par défaut</em>
              ) : (
                <button type="button" className="del2" onClick={() => setRemoving(c)}>
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <ConfirmSheet
          title={`Supprimer « ${removing.name} » ?`}
          text="Ses dépenses passent dans Divers et ses plafonds de budget sont supprimés."
          confirmLabel="Supprimer"
          onConfirm={() => deleteCategory.mutate(removing.id)}
          onClose={() => setRemoving(null)}
        />
      )}
    </Screen>
  );
}
