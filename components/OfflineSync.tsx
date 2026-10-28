"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { flush, onPendingChange, pendingCount, refreshPending } from "@/lib/client/offlineQueue";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export const useOnline = () =>
  useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

/**
 * Hors ligne (section 10.7) : bandeau « Hors ligne », boutons d'écriture désactivés (classe `offline`
 * sur <html>, sauf dans Courses), et file d'attente des Courses rejouée au retour du réseau.
 */
export function OfflineSync() {
  const online = useOnline();
  const qc = useQueryClient();
  const [pending, setPending] = useState(pendingCount);

  useEffect(() => onPendingChange(setPending), []);

  useEffect(() => {
    document.documentElement.classList.toggle("offline", !online);
    if (!online) return;
    void refreshPending()
      .then(() => flush())
      .then(() => {
        void qc.invalidateQueries({ queryKey: ["shopping"] });
        void qc.invalidateQueries({ queryKey: ["history"] });
      });
  }, [online, qc]);

  if (online && pending === 0) return null;
  return (
    <div className="offbar" role="status">
      {online ? `Envoi de ${pending} modification${pending > 1 ? "s" : ""}…` : "Hors ligne"}
      {!online && pending > 0 && <span> · {pending} en attente</span>}
    </div>
  );
}
