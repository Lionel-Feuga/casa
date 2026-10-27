"use client";

import { useRealtime } from "./Realtime";

const STATUS = {
  connecting: "connexion…",
  connected: "connecté",
  offline: "hors ligne, rechargement toutes les 15 s",
  disabled: "pas encore configuré, rechargement toutes les 15 s",
} as const;

// Contenu provisoire des modules pas encore construits.
export function Soon({ label, step }: { label: string; step: number }) {
  const { status } = useRealtime();
  return (
    <>
      <span className="tape">Bientôt</span>
      <div className="card soon">
        <b>{label}</b>
        <p>Ce module arrive à l’étape {step}.</p>
        <p>Temps réel : {STATUS[status]}.</p>
      </div>
    </>
  );
}
