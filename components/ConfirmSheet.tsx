"use client";

import { Sheet } from "./Sheet";

// Confirmation dessinée dans l'appli (section 9 : jamais confirm()).
export function ConfirmSheet({
  title,
  text,
  confirmLabel,
  cancelLabel = "Annuler",
  onConfirm,
  onClose,
}: {
  title: string;
  text?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <h3>{title}</h3>
      {text && <p className="note">{text}</p>}
      <div className="btn2">
        <button type="button" className="btn" onClick={onClose}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className="btn go"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
