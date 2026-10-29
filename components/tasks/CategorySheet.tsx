"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import type { TaskCategory } from "@/lib/client/tasks";
import { TASK_CATEGORY_NAME_MAX } from "@/lib/domain/tasks";

// Créer, renommer ou supprimer une catégorie de tâches. Ses tâches passent alors dans « Sans catégorie ».
export function CategorySheet({
  category,
  onSave,
  onDelete,
  onClose,
}: {
  category?: TaskCategory;
  onSave: (name: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete && category && onDelete)
    return (
      <Sheet title="Supprimer la catégorie ?" onClose={onClose}>
        <h3>Supprimer « {category.name} » ?</h3>
        <p className="note">Ses tâches sont gardées : elles passent dans « Sans catégorie ».</p>
        <div className="btn2">
          <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
            Annuler
          </button>
          <button
            type="button"
            className="btn go"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            Supprimer
          </button>
        </div>
      </Sheet>
    );

  const save = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  return (
    <Sheet title={category ? "Modifier la catégorie" : "Nouvelle catégorie"} onClose={onClose}>
      <h3>{category ? "Modifier la catégorie" : "Nouvelle catégorie"}</h3>
      <div className="field">
        <label htmlFor="cat-name">Nom</label>
        <input
          id="cat-name"
          className="inp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={TASK_CATEGORY_NAME_MAX}
          placeholder="Ménage, Bricolage, Papiers…"
          autoFocus
          enterKeyHint="done"
        />
      </div>
      <div className="btn2">
        <button type="button" className="btn" onClick={onClose}>
          Annuler
        </button>
        <button type="button" className="btn go" data-online-only onClick={save} disabled={!name.trim()}>
          {category ? "Enregistrer" : "Créer"}
        </button>
      </div>
      {category && onDelete && (
        <button type="button" className="linkbtn" onClick={() => setConfirmDelete(true)}>
          Supprimer cette catégorie
        </button>
      )}
    </Sheet>
  );
}
