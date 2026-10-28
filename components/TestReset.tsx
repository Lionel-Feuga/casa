"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Eraser } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { writeLocal } from "@/lib/client/storage";
import { ConfirmSheet } from "./ConfirmSheet";

// TEMPORAIRE, pour la période de tests (voir app/api/test-reset). À retirer avant l'usage réel.
export function TestResetButton({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [state, setState] = useState<"" | "busy" | "err">("");

  const reset = async () => {
    setState("busy");
    try {
      await api("/test-reset", { method: "POST" });
      writeLocal("casa.cache.shopping", null);
      qc.clear();
      await qc.invalidateQueries();
      onDone();
    } catch {
      setState("err");
    }
  };

  return (
    <>
      <button type="button" className="btn" data-online-only onClick={() => setConfirm(true)} disabled={state === "busy"}>
        <Eraser size={20} strokeWidth={2.6} aria-hidden="true" />
        Effacer les données de test
        <small>{state === "err" ? "échec, réessaie" : "temporaire"}</small>
      </button>
      {confirm && (
        <ConfirmSheet
          title="Tout effacer ?"
          text="Courses, suggestions, dépenses, règlements, plafonds, tâches, factures et catégories créées seront supprimés pour vous deux. Les catégories par défaut et les téléphones connectés sont gardés. Impossible d’annuler."
          confirmLabel="Tout effacer"
          onConfirm={() => void reset()}
          onClose={() => setConfirm(false)}
        />
      )}
    </>
  );
}
