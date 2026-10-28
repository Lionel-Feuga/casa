"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Screen } from "@/components/Screen";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { useTaskActions, useTasks, type Task } from "@/lib/client/tasks";
import { useLongPress } from "@/lib/client/useLongPress";
import { doneLabel, dueLabel, isLate, taskSections, type TaskFilter } from "@/lib/domain/tasks";

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "lionel", label: "Lionel" },
  { value: "jaz", label: "Jaz" },
  { value: "both", label: "Les deux" },
];

const WHO = { lionel: "L", jaz: "J", both: "LJ" } as const;

function TaskRow({ task, now, onToggle, onEdit }: { task: Task; now: Date; onToggle: () => void; onEdit: () => void }) {
  const lp = useLongPress(onEdit);
  const late = isLate(task, now);
  const sub = task.done ? doneLabel(task, now) : task.dueDate ? `${late ? "en retard · " : ""}${dueLabel(task.dueDate)}` : null;
  const who = WHO[task.assignee];
  return (
    <li>
      <div
        className={`it${task.done ? " done" : ""}`}
        role="checkbox"
        aria-checked={task.done}
        tabIndex={0}
        {...lp.handlers}
        onClick={() => {
          if (!lp.consumed()) onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onToggle();
          } else if (e.key === "e") onEdit();
        }}
      >
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
      </div>
    </li>
  );
}

export default function AFairePage() {
  const { data: tasks = [], isPending } = useTasks();
  const actions = useTaskActions();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [sheet, setSheet] = useState<{ task?: Task } | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Les libellés (« fait hier », « visible encore 6 j ») et l'expiration avancent avec le temps.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const s = taskSections(tasks, filter, now);
  const section = (label: string, tone: string, list: Task[]) =>
    list.length > 0 && (
      <>
        <span className={`tape c-${tone}`}>{label}</span>
        <ul className="items">
          {list.map((t) => (
            <TaskRow key={t.id} task={t} now={now} onToggle={() => actions.toggle(t)} onEdit={() => setSheet({ task: t })} />
          ))}
        </ul>
      </>
    );
  const empty = !isPending && !s.week.length && !s.later.length && !s.whenever.length && !s.done.length;

  return (
    <Screen title="À faire">
      <button type="button" className="add addbtn" onClick={() => setSheet({})}>
        <Icon name="plus" />
        <span>Ajouter une tâche</span>
      </button>

      <div className="chips" role="group" aria-label="Filtrer">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {section("Cette semaine", "pk", s.week)}
      {section("Plus tard", "bl", s.later)}
      {section("Quand on peut", "tl", s.whenever)}
      {section("Fait cette semaine", "ink", s.done)}

      {empty && (
        <div className="card empty">
          <p>{filter === "all" ? "Rien à faire pour l’instant." : "Aucune tâche avec ce filtre."}</p>
        </div>
      )}
      {!empty && <p className="meta hint">Appui long sur une tâche pour la modifier ou la supprimer.</p>}

      {sheet && (
        <TaskSheet
          task={sheet.task}
          onSave={(input) => (sheet.task ? actions.edit(sheet.task.id, input) : actions.add(input))}
          onDelete={sheet.task ? () => actions.remove(sheet.task!.id) : undefined}
          onClose={() => setSheet(null)}
        />
      )}
    </Screen>
  );
}
