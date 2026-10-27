"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Feuille du bas, utilisée pour les menus et toutes les confirmations (jamais alert() ni confirm()).
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, [href], input")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="dim" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </div>
    </>,
    document.body,
  );
}
