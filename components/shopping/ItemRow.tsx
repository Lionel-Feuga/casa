"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRef, useState } from "react";
import type { ShoppingItem } from "@/lib/domain/shopping";
import { PROFILE_INITIAL } from "@/lib/domain/profile";
import { Icon } from "../Icon";

const SWIPE_OPEN = -100;
const SWIPE_START = 10;

export function ItemFace({
  item,
  className = "",
  style,
  flash,
  ...rest
}: { item: ShoppingItem; className?: string; style?: React.CSSProperties; flash?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const initial = PROFILE_INITIAL[item.addedBy];
  return (
    <div
      className={`it${item.checked ? " done" : ""}${flash ? " flash" : ""} ${className}`}
      style={style}
      role="checkbox"
      aria-checked={item.checked}
      tabIndex={0}
      {...rest}
    >
      <span className="grip" data-handle="true" aria-hidden="true">
        <span>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      </span>
      <span className="box" aria-hidden="true">
        <Icon name="check" />
      </span>
      <span className="nm">
        {item.name}
        <s className="strike" aria-hidden="true" />
      </span>
      <span className={`who w-${initial}`} aria-label={`ajouté par ${item.addedBy === "lionel" ? "Lionel" : "Jaz"}`}>
        {initial}
      </span>
    </div>
  );
}

export function ItemRow({
  item,
  open,
  flash,
  onOpen,
  onToggle,
  onDelete,
  shouldIgnoreClick,
}: {
  item: ShoppingItem;
  open: boolean;
  flash: boolean;
  onOpen: (id: string | null) => void;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  shouldIgnoreClick: () => boolean;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: item.id });
  const [dx, setDx] = useState<number | null>(null);
  const swipe = useRef<{ x: number; y: number; base: number; active: boolean; id: number } | null>(null);
  const swiped = useRef(false);

  // Glisser vers la gauche (doigt seulement) fait apparaître « Supprimer » (section 3.1).
  const onPointerDown = (e: React.PointerEvent) => {
    swiped.current = false;
    if (e.pointerType === "mouse") return;
    swipe.current = { x: e.clientX, y: e.clientY, base: open ? SWIPE_OPEN : 0, active: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    if (isDragging) {
      swipe.current = null;
      setDx(null);
      return;
    }
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.active) {
      if (Math.abs(mx) < SWIPE_START || Math.abs(mx) < Math.abs(my) * 1.2) {
        if (Math.abs(my) > SWIPE_START) swipe.current = null;
        return;
      }
      s.active = true;
    }
    setDx(Math.max(SWIPE_OPEN - 30, Math.min(0, s.base + mx)));
  };
  const endSwipe = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.active) return;
    swiped.current = true;
    onOpen((dx ?? 0) < SWIPE_OPEN / 2 ? item.id : null);
    setDx(null);
  };

  const offset = dx ?? (open ? SWIPE_OPEN : 0);

  return (
    <li ref={setNodeRef} data-item={item.id} className={`row${isDragging ? " dragging" : ""}`} style={{ transform: CSS.Translate.toString(transform), transition }}>
      {(offset < 0 || open) && (
        <button type="button" className="del" tabIndex={open ? 0 : -1} onClick={() => onDelete(item)}>
          Supprimer
        </button>
      )}
      <ItemFace
        item={item}
        flash={flash}
        className={dx !== null ? "swiping" : ""}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        {...listeners}
        onPointerDown={(e) => {
          listeners?.onPointerDown?.(e);
          onPointerDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        onClick={() => {
          if (swiped.current || shouldIgnoreClick()) return;
          if (open) return onOpen(null);
          onToggle(item);
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onToggle(item);
          } else if (e.key === "Delete" || e.key === "Backspace") {
            onDelete(item);
          }
        }}
      />
    </li>
  );
}
