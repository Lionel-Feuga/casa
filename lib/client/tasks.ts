"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DONE_VISIBLE_MS, type Task } from "@/lib/domain/tasks";
import type { TaskInput } from "@/lib/tasks/server";
import { api, getStoredProfile } from "./api";
import { newObjectId } from "./shopping";

export type { Task, TaskInput };

const KEY = ["tasks"] as const;

export function useTasks() {
  return useQuery({ queryKey: KEY, queryFn: async () => (await api<{ tasks: Task[] }>("/tasks")).tasks });
}

/** Mises à jour optimistes : la tâche change tout de suite à l'écran. */
export function useTaskActions() {
  const qc = useQueryClient();
  const optimistic = async (fn: (list: Task[]) => Task[]) => {
    await qc.cancelQueries({ queryKey: KEY });
    const prev = qc.getQueryData<Task[]>(KEY) ?? [];
    qc.setQueryData<Task[]>(KEY, (old) => fn(old ?? []));
    return prev;
  };
  const rollback = (_e: unknown, _v: unknown, prev: Task[] | undefined) => {
    if (prev) qc.setQueryData(KEY, prev);
  };
  const settle = () => {
    if (qc.isMutating() <= 1) return qc.invalidateQueries({ queryKey: KEY });
  };

  const add = useMutation({
    mutationFn: (v: TaskInput & { id: string }) => api("/tasks", { method: "POST", body: JSON.stringify(v) }),
    onMutate: (v) =>
      optimistic((list) => [
        ...list,
        { id: v.id, title: v.title, assignee: v.assignee, dueDate: v.dueDate ?? undefined, done: false, createdAt: new Date().toISOString() },
      ]),
    onError: rollback,
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<TaskInput> & { done?: boolean }) =>
      api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onMutate: ({ id, ...patch }) =>
      optimistic((list) =>
        list.map((t) => {
          if (t.id !== id) return t;
          const next: Task = { ...t, ...patch, dueDate: patch.dueDate === null ? undefined : (patch.dueDate ?? t.dueDate) };
          if (patch.done === true) {
            const now = new Date();
            Object.assign(next, { doneAt: now.toISOString(), doneBy: getStoredProfile() ?? undefined, expireAt: new Date(now.getTime() + DONE_VISIBLE_MS).toISOString() });
          } else if (patch.done === false) Object.assign(next, { doneAt: undefined, doneBy: undefined, expireAt: undefined });
          return next;
        }),
      ),
    onError: rollback,
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/tasks/${id}`, { method: "DELETE" }),
    onMutate: (id) => optimistic((list) => list.filter((t) => t.id !== id)),
    onError: rollback,
    onSettled: settle,
  });

  return {
    add: (input: TaskInput) => add.mutate({ ...input, id: newObjectId() }),
    toggle: (t: Task) => update.mutate({ id: t.id, done: !t.done }),
    edit: (id: string, input: TaskInput) => update.mutate({ id, ...input }),
    remove: (id: string) => remove.mutate(id),
  };
}
