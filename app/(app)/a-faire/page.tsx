"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateKeyBetween } from "fractional-indexing";
import { FolderPlus, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { CasaMouseSensor, CasaTouchSensor, dropAnimation, verticalOnly } from "@/components/shopping/ShoppingList";
import { CategorySheet } from "@/components/tasks/CategorySheet";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { useTaskActions, useTaskCategories, useTasks, type Task, type TaskCategory } from "@/lib/client/tasks";
import { doneLabel, dueLabel, groupTasks, isLate, NO_CATEGORY, type TaskFilter, type TaskGroup } from "@/lib/domain/tasks";

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "lionel", label: "Lionel" },
  { value: "jaz", label: "Jaz" },
  { value: "both", label: "Les deux" },
];

const WHO = { lionel: "L", jaz: "J", both: "LJ" } as const;
const GROUP = "group:";

function TaskFace({ task, now, className = "", onEdit, ...rest }: { task: Task; now: Date; className?: string; onEdit?: () => void } & React.HTMLAttributes<HTMLDivElement>) {
  const late = isLate(task, now);
  const sub = task.done ? doneLabel(task, now) : task.dueDate ? `${late ? "en retard · " : ""}${dueLabel(task.dueDate)}` : null;
  const who = WHO[task.assignee];
  return (
    <div className={`it${task.done ? " done" : ""} ${className}`} role="checkbox" aria-checked={task.done} tabIndex={0} {...rest}>
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
        <span className="tt">
          {task.title}
          <s className="strike" aria-hidden="true" />
        </span>
        {sub && <small className={late ? "late" : undefined}>{sub}</small>}
      </span>
      <span className={`who w-${who}`} aria-label={task.assignee === "both" ? "pour les deux" : `pour ${task.assignee === "lionel" ? "Lionel" : "Jaz"}`}>
        {who === "LJ" ? "L+J" : who}
      </span>
      {onEdit && (
        <button
          type="button"
          className="edit"
          aria-label={`Modifier ${task.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil size={17} strokeWidth={2.6} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function TaskRow({ task, now, onToggle, onEdit, ignoreClick }: { task: Task; now: Date; onToggle: () => void; onEdit: () => void; ignoreClick: () => boolean }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <li ref={setNodeRef} className={`row${isDragging ? " dragging" : ""}`} style={{ transform: CSS.Translate.toString(transform), transition }} data-online-only>
      <TaskFace
        task={task}
        now={now}
        onEdit={onEdit}
        {...listeners}
        onClick={() => {
          if (!ignoreClick()) onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onToggle();
          }
        }}
      />
    </li>
  );
}

function GroupList({ group, ids, children }: { group: TaskGroup; ids: string[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: GROUP + group.id });
  return (
    <SortableContext id={group.id} items={ids} strategy={verticalListSortingStrategy}>
      <ul ref={setNodeRef} className={`items drop${isOver ? " over" : ""}`}>
        {children}
        {ids.length === 0 && <li className="drop-hint">Glisse une tâche ici</li>}
      </ul>
    </SortableContext>
  );
}

export default function AFairePage() {
  const { data: tasks = [], isPending } = useTasks();
  const { data: categories = [] } = useTaskCategories();
  const actions = useTaskActions();
  const sensors = useSensors(useSensor(CasaTouchSensor), useSensor(CasaMouseSensor));
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [sheet, setSheet] = useState<{ task?: Task; categoryId?: string | null } | null>(null);
  const [catSheet, setCatSheet] = useState<{ category?: TaskCategory } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  // Rangement pendant le glisser, puis jusqu'à ce que les données suivent (voir ShoppingList).
  const [drag, setDrag] = useState<Record<string, string[]> | null>(null);
  const [pending, setPending] = useState<{ id: string; categoryId?: string; position: string } | null>(null);
  const lastDragEnd = useRef(0);

  // Les libellés (« fait hier », « visible encore 6 j ») et l'expiration avancent avec le temps.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const grouped = useMemo(() => groupTasks(tasks, categories, filter, now), [tasks, categories, filter, now]);
  // Pendant un glisser, « Sans catégorie » reste toujours visible pour pouvoir y déposer une tâche.
  const groups = useMemo(
    () => (activeId && !grouped.some((g) => g.id === NO_CATEGORY) ? [...grouped, { id: NO_CATEGORY, name: "Sans catégorie", tone: "ink" as const, tasks: [] }] : grouped),
    [grouped, activeId],
  );
  const derived = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.tasks.map((t) => t.id)])), [groups]);
  const layout = drag ?? derived;
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  useEffect(() => {
    if (!pending) return;
    const t = byId.get(pending.id);
    if (!t || (t.position === pending.position && (t.categoryId ?? undefined) === pending.categoryId)) {
      setPending(null);
      setDrag(null);
    }
  }, [byId, pending]);

  const containerOf = (id: string) => (id.startsWith(GROUP) ? id.slice(GROUP.length) : Object.keys(layout).find((k) => layout[k].includes(id)));

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setDrag({ ...Object.fromEntries(Object.entries(derived).map(([k, v]) => [k, [...v]])), [NO_CATEGORY]: [...(derived[NO_CATEGORY] ?? [])] });
    navigator.vibrate?.(15);
  };

  // Passage d'une catégorie à l'autre pendant le glisser.
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !drag) return;
    const id = String(active.id);
    const from = containerOf(id);
    const to = containerOf(String(over.id));
    if (!from || !to || from === to) return;
    setDrag((cur) => {
      if (!cur) return cur;
      const target = cur[to].filter((x) => x !== id);
      const overIndex = target.indexOf(String(over.id));
      target.splice(overIndex < 0 ? target.length : overIndex, 0, id);
      return { ...cur, [from]: cur[from].filter((x) => x !== id), [to]: target };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    lastDragEnd.current = Date.now();
    const id = String(active.id);
    const container = containerOf(id);
    if (!drag || !over || !container) return setDrag(null);
    let ids = drag[container];
    const overIndex = ids.indexOf(String(over.id));
    const from = ids.indexOf(id);
    if (overIndex >= 0 && overIndex !== from) ids = arrayMove(ids, from, overIndex);
    const i = ids.indexOf(id);
    const before = byId.get(ids[i - 1])?.position || null;
    const after = byId.get(ids[i + 1])?.position || null;
    const position = before && after && before >= after ? generateKeyBetween(before, null) : generateKeyBetween(before, after);
    const categoryId = container === NO_CATEGORY ? undefined : container;
    const task = byId.get(id);
    if (task && task.position === position && (task.categoryId ?? undefined) === categoryId) return setDrag(null);
    setDrag({ ...drag, [container]: ids });
    setPending({ id, categoryId, position });
    actions.move(id, categoryId ?? null, position);
  };

  const active = activeId ? byId.get(activeId) : undefined;
  const empty = !isPending && tasks.length === 0 && categories.length === 0;

  return (
    <Screen title="À faire">
      <div className="todo-actions">
        <button type="button" className="add addbtn" data-online-only onClick={() => setSheet({})}>
          <Icon name="plus" />
          <span>Ajouter une tâche</span>
        </button>
        <button type="button" className="btn catbtn" data-online-only onClick={() => setCatSheet({})} aria-label="Nouvelle catégorie">
          <FolderPlus size={20} strokeWidth={2.6} aria-hidden="true" />
          Catégorie
        </button>
      </div>

      <div className="chips" role="group" aria-label="Filtrer">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        modifiers={[verticalOnly]}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDrag(null);
          lastDragEnd.current = Date.now();
        }}
      >
        {groups.map((g) => {
          const ids = layout[g.id] ?? [];
          const category = categories.find((c) => c.id === g.id);
          return (
            <section key={g.id} className="grp" aria-label={g.name}>
              <div className="grp-head">
                <span className={`tape c-${g.tone}`}>{g.name}</span>
                <span className="grp-tools">
                  {category && (
                    <button type="button" className="mini" data-online-only onClick={() => setCatSheet({ category })} aria-label={`Renommer ou supprimer ${g.name}`}>
                      <Pencil size={16} strokeWidth={2.6} aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="mini"
                    data-online-only
                    onClick={() => setSheet({ categoryId: g.id === NO_CATEGORY ? null : g.id })}
                    aria-label={`Ajouter une tâche dans ${g.name}`}
                  >
                    <Plus size={18} strokeWidth={2.8} aria-hidden="true" />
                  </button>
                </span>
              </div>
              <GroupList group={g} ids={ids}>
                {ids.map((id) => {
                  const t = byId.get(id);
                  if (!t) return null;
                  return (
                    <TaskRow
                      key={id}
                      task={t}
                      now={now}
                      onToggle={() => actions.toggle(t)}
                      onEdit={() => setSheet({ task: t })}
                      ignoreClick={() => Date.now() - lastDragEnd.current < 350}
                    />
                  );
                })}
              </GroupList>
            </section>
          );
        })}
        <DragOverlay dropAnimation={dropAnimation}>{active ? <TaskFace task={active} now={now} className="lift" /> : null}</DragOverlay>
      </DndContext>

      {empty && (
        <div className="card empty">
          <p>Rien à faire pour l’instant.</p>
        </div>
      )}
      {!empty && <p className="meta hint">Touche une tâche pour la cocher, le crayon pour la modifier. Appui long ou poignée pour la déplacer.</p>}

      {sheet && (
        <TaskSheet
          task={sheet.task}
          categories={[...categories].sort((a, b) => (a.position < b.position ? -1 : 1))}
          defaultCategoryId={sheet.categoryId ?? null}
          onSave={(input) => (sheet.task ? actions.edit(sheet.task.id, input) : actions.add(input))}
          onDelete={sheet.task ? () => actions.remove(sheet.task!.id) : undefined}
          onClose={() => setSheet(null)}
        />
      )}
      {catSheet && (
        <CategorySheet
          category={catSheet.category}
          onSave={(name) => (catSheet.category ? actions.renameCategory(catSheet.category.id, name) : actions.createCategory(name))}
          onDelete={catSheet.category ? () => actions.deleteCategory(catSheet.category!.id) : undefined}
          onClose={() => setCatSheet(null)}
        />
      )}
    </Screen>
  );
}
