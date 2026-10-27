"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { AddBar } from "@/components/shopping/AddBar";
import { ShoppingList } from "@/components/shopping/ShoppingList";
import { useShoppingActions, useShoppingItems, useSuggestions } from "@/lib/client/shopping";
import type { ShoppingItem, Suggestion } from "@/lib/domain/shopping";

const UNDO_MS = 3000;
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export default function CoursesPage() {
  const { data: items = [], isPending, isError } = useShoppingItems();
  const { data: history = [] } = useSuggestions();
  const actions = useShoppingActions();

  const [flashId, setFlashId] = useState<string | null>(null);
  const [undo, setUndo] = useState<ShoppingItem | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [hiding, setHiding] = useState<Suggestion | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const checked = items.filter((i) => i.checked).length;

  // Bandeau « Article supprimé · Annuler » pendant 3 secondes
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [undo]);

  const flash = (id: string) => {
    window.clearTimeout(flashTimer.current);
    setFlashId(null);
    requestAnimationFrame(() => {
      setFlashId(id);
      document.querySelector(`[data-item="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    flashTimer.current = window.setTimeout(() => setFlashId(null), 900);
  };

  return (
    <Screen title="Courses">
      <AddBar
        items={items}
        history={history}
        onAdd={(name) => {
          const { flashId: id } = actions.addByName(name);
          if (id) flash(id);
        }}
        onHide={setHiding}
      />

      <div className="lhead">
        <span className="meta">
          {plural(items.length, "article", "articles")} · {plural(checked, "coché", "cochés")}
        </span>
        {checked > 0 && (
          <button type="button" className="vider" onClick={() => setConfirmClear(true)}>
            <Icon name="basket" />
            Vider le panier
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <ShoppingList
          items={items}
          flashId={flashId}
          onToggle={(i) => actions.toggle.mutate({ id: i.id, checked: !i.checked })}
          onDelete={(i) => {
            actions.remove.mutate(i);
            setUndo(i);
          }}
          onMove={(id, position) => actions.move.mutate({ id, position })}
        />
      ) : isPending ? null : (
        <div className="card empty">
          {isError ? <p>Impossible de charger la liste. Vérifie le réseau.</p> : <p>La liste est vide.</p>}
        </div>
      )}

      {undo && (
        <div className="toast" role="status">
          <span>Article supprimé</span>
          <button
            type="button"
            onClick={() => {
              actions.restore.mutate(undo);
              setUndo(null);
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {confirmClear && (
        <ConfirmSheet
          title="Vider le panier ?"
          text={`${plural(checked, "article coché sera retiré", "articles cochés seront retirés")} de la liste. Les suggestions sont gardées.`}
          confirmLabel="Vider"
          onConfirm={() => actions.clearChecked.mutate()}
          onClose={() => setConfirmClear(false)}
        />
      )}

      {hiding && (
        <ConfirmSheet
          title="Retirer des suggestions ?"
          text={`« ${hiding.label} » ne sera plus proposé. Il reviendra si vous l’ajoutez à nouveau à la main.`}
          confirmLabel="Retirer"
          onConfirm={() => actions.hideSuggestion.mutate(hiding.key)}
          onClose={() => setHiding(null)}
        />
      )}
    </Screen>
  );
}
