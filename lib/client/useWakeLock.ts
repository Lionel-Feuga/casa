"use client";

import { useEffect } from "react";

/** Garde l'écran allumé (section 3.6). Sans prise en charge, on ignore sans message. */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const request = async () => {
      try {
        if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
        lock = await navigator.wakeLock.request("screen");
        if (released) void lock.release();
      } catch {
        /* refusé ou non pris en charge */
      }
    };
    // Le verrou saute quand l'appli passe en arrière-plan : on le reprend au retour.
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);
}
