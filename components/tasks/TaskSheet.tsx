"use client";

import { useState } from "react";
import { Segmented } from "@/components/money/Segmented";
import { useSession } from "@/components/Providers";
import { Sheet } from "@/components/Sheet";
import type { Task, TaskInput } from "@/lib/client/tasks";
import { dayInParis, isDay } from "@/lib/domain/dates";
import { TASK_TITLE_MAX, type Assignee } from "@/lib/domain/tasks";

// Ajout ou modification d'une tâche (section 7) : titre, pour qui, date facultative.
export function TaskSheet({
  task,
  onSave,
  onDelete,
  onClose,
}: {
  task?: Task;
  onSave: (input: TaskInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { profile } = useSession();
  const [title, setTitle] = useState(task?.title ?? "");
  const [assignee, setAssignee] = useState<Assignee>(task?.assignee ?? profile ?? "both");
  const [due, setDue] = useState(task?.dueDate ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) return setError("Donne un titre à la tâche.");
    if (due && !isDay(due)) return setError("Date invalide.");
    onSave({ title: title.trim(), assignee, dueDate: due || null });
    onClose();
  };

  if (confirmDelete && onDelete)
    return (
      <Sheet title="Supprimer la tâche ?" onClose={onClose}>
        <h3>Supprimer la tâche ?</h3>
        <p className="note">« {task?.title} » disparaît pour vous deux.</p>
        <div className="btn2">
          <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
            Annuler
          </button>
          <button
            type="button"
            className="btn go"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            Supprimer
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet title={task ? "Modifier la tâche" : "Nouvelle tâche"} onClose={onClose}>
      <h3>{task ? "Modifier la tâche" : "Nouvelle tâche"}</h3>
      <form
        className="menu"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="field">
          <label htmlFor="task-title">Quoi</label>
          <input id="task-title" className="inp" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={TASK_TITLE_MAX} autoFocus={!task} enterKeyHint="done" />
        </div>
        <div className="field">
          <span>Pour qui</span>
          <Segmented<Assignee>
            label="Pour qui"
            value={assignee}
            onChange={setAssignee}
            options={[
              { value: "lionel", label: "Lionel" },
              { value: "jaz", label: "Jaz" },
              { value: "both", label: "Les deux" },
            ]}
          />
        </div>
        <div className="field">
          <label htmlFor="task-due">Date (facultative)</label>
          <div className="other">
            <input id="task-due" className="inp" type="date" value={due} min={task ? undefined : dayInParis()} onChange={(e) => setDue(e.target.value)} />
            {due && (
              <button type="button" className="btn" onClick={() => setDue("")}>
                Sans date
              </button>
            )}
          </div>
        </div>
        {error && (
          <p className="ferr" role="alert">
            {error}
          </p>
        )}
        <div className="btn2">
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn go">
            {task ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
        {task && onDelete && (
          <button type="button" className="linkbtn" onClick={() => setConfirmDelete(true)}>
            Supprimer cette tâche
          </button>
        )}
      </form>
    </Sheet>
  );
}
