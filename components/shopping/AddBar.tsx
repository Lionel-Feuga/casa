"use client";

import { useMemo, useRef, useState } from "react";
import { normalizeName } from "@/lib/domain/normalize";
import { rankSuggestions, type ShoppingItem, type Suggestion } from "@/lib/domain/shopping";
import { useLongPress } from "@/lib/client/useLongPress";
import { Icon } from "../Icon";

/** Met en avant le début tapé (comparaison sans accents : on souligne autant de lettres que la saisie). */
function Highlight({ label, query }: { label: string; query: string }) {
  const n = normalizeName(query).length;
  let cut = 0;
  while (cut < label.length && normalizeName(label.slice(0, cut)).length < n) cut++;
  return (
    <span>
      <u>{label.slice(0, cut)}</u>
      {label.slice(cut)}
    </span>
  );
}

function SuggestionRow({
  s,
  query,
  onPick,
  onLongPress,
}: {
  s: Suggestion;
  query: string;
  onPick: (s: Suggestion) => void;
  onLongPress: (s: Suggestion) => void;
}) {
  const lp = useLongPress(() => onLongPress(s));
  return (
    <li>
      <button
        type="button"
        {...lp.handlers}
        onPointerDown={(e) => {
          e.preventDefault(); // garde le clavier ouvert
          lp.handlers.onPointerDown(e);
        }}
        onClick={() => {
          if (!lp.consumed()) onPick(s);
        }}
      >
        <Highlight label={s.label} query={query} />
        <small>{s.count} fois</small>
      </button>
    </li>
  );
}

export function AddBar({
  items,
  history,
  onAdd,
  onHide,
}: {
  items: ShoppingItem[];
  history: Suggestion[];
  onAdd: (name: string) => void;
  onHide: (s: Suggestion) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => rankSuggestions(history, value, items), [history, value, items]);

  const submit = (name: string) => {
    if (!name.trim()) return;
    onAdd(name);
    setValue("");
    inputRef.current?.focus(); // le champ reste ouvert pour enchaîner
  };

  return (
    <>
      <form
        className="add"
        data-keep-keyboard
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <Icon name="plus" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ajouter un article…"
          aria-label="Ajouter un article"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck={false}
          maxLength={80}
        />
        {value.trim() && (
          <button type="submit" className="ok" onPointerDown={(e) => e.preventDefault()}>
            Ajouter
          </button>
        )}
      </form>
      {suggestions.length > 0 && (
        <ul className="sugg" aria-label="Suggestions">
          {suggestions.map((s) => (
            <SuggestionRow key={s.key} s={s} query={value} onPick={(x) => submit(x.label)} onLongPress={onHide} />
          ))}
        </ul>
      )}
    </>
  );
}
