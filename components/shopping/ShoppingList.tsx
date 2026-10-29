"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type Modifier,
  type MouseSensorOptions,
  type TouchSensorOptions,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useMemo, useRef, useState } from "react";
import { positionForMove, sortItems, type ShoppingItem } from "@/lib/domain/shopping";
import { ItemFace, ItemRow } from "./ItemRow";

const onHandle = (target: EventTarget | null) => target instanceof Element && !!target.closest("[data-handle]");

/*
 * Section 3.4 : appui long (~250 ms) sur l'article, ou glisser tout de suite depuis la poignée.
 * Le capteur choisit sa contrainte selon l'endroit touché.
 */
export class CasaTouchSensor extends TouchSensor {
  constructor(props: ConstructorParameters<typeof TouchSensor>[0]) {
    const options: TouchSensorOptions = {
      ...props.options,
      activationConstraint: onHandle(props.event.target) ? { delay: 0, tolerance: 20 } : { delay: 250, tolerance: 8 },
    };
    super({ ...props, options });
  }
}

export class CasaMouseSensor extends MouseSensor {
  constructor(props: ConstructorParameters<typeof MouseSensor>[0]) {
    const options: MouseSensorOptions = {
      ...props.options,
      activationConstraint: onHandle(props.event.target) ? { distance: 1 } : { distance: 8 },
    };
    super({ ...props, options });
  }
}

// Au lâcher, l'article soulevé se pose sur sa nouvelle place ; l'emplacement reste caché pendant ce temps.
export const dropAnimation: DropAnimation = {
  duration: 180,
  easing: "cubic-bezier(.3,1.3,.5,1)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } }),
};

export const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function ShoppingList({
  items: incoming,
  flashId,
  onToggle,
  onDelete,
  onMove,
}: {
  items: ShoppingItem[];
  flashId: string | null;
  onToggle: (item: ShoppingItem) => void;
  onDelete: (item: ShoppingItem) => void;
  onMove: (id: string, position: string) => void;
}) {
  const sensors = useSensors(useSensor(CasaTouchSensor), useSensor(CasaMouseSensor));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const lastDragEnd = useRef(0);

  // Le cache de TanStack Query notifie l'écran au tour suivant : sans cet ordre local, la liste
  // s'afficherait une image dans l'ancien ordre après le lâcher, puis sauterait au nouveau.
  const [pending, setPending] = useState<{ id: string; position: string } | null>(null);
  const items = useMemo(
    () => (pending ? sortItems(incoming.map((i) => (i.id === pending.id ? { ...i, position: pending.position } : i))) : incoming),
    [incoming, pending],
  );
  useEffect(() => {
    if (pending && incoming.find((i) => i.id === pending.id)?.position === pending.position) setPending(null);
  }, [incoming, pending]);

  const active = items.find((i) => i.id === activeId);

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOpenId(null);
    navigator.vibrate?.(15);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    lastDragEnd.current = Date.now();
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from < 0 || to < 0) return;
    const id = String(e.active.id);
    const position = positionForMove(items, from, to);
    setPending({ id, position });
    onMove(id, position);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        lastDragEnd.current = Date.now();
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="items">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              open={openId === item.id}
              flash={flashId === item.id}
              onOpen={setOpenId}
              onToggle={onToggle}
              onDelete={(i) => {
                setOpenId(null);
                onDelete(i);
              }}
              shouldIgnoreClick={() => Date.now() - lastDragEnd.current < 350}
            />
          ))}
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimation}>
        {active ? <ItemFace item={active} className="lift" /> : null}
      </DragOverlay>
    </DndContext>
  );
}
