"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { generateKeyBetween } from "fractional-indexing";
import { DONE_VISIBLE_MS, type Task, type TaskCategory } from "@/lib/domain/tasks";
import type { TaskInput, TaskPatch } from "@/lib/tasks/server";
import { api, getStoredProfile } from "./api";
import { newObjectId } from "./shopping";

export type { Task, TaskCategory, TaskInput };

const KEY = ["tasks"] as const;
const CATS_KEY = ["tasks", "categories"] as const;

export function useTasks() {
  return useQuery({ queryKey: KEY, queryFn: async () => (await api<{ tasks: Task[] }>("/tasks")).tasks });
}

export function useTaskCategories() {
  return useQuery({ queryKey: CATS_KEY, queryFn: async () => (await api<{ categories: TaskCategory[] }>("/task-categories")).categories });
}

const lastPosition = (list: { position: string }[]) => list.reduce<string | null>((m, x) => (x.position && (!m || x.position > m) ? x.position : m), null);

/** Mises à jour optimistes : la tâche change tout de suite à l'écran. */
export function useTaskActions() {
  const qc = useQueryClient();
  const tasksNow = () => qc.getQueryData<Task[]>(KEY) ?? [];
  const setTasks = (fn: (list: Task[]) => Task[]) => qc.setQueryData<Task[]>(KEY, (old) => fn(old ?? []));
  const rollback = (_e: unknown, _v: unknown, prev: Task[] | undefined) => {
    if (prev) qc.setQueryData(KEY, prev);
  };
  const settle = () => {
    if (qc.isMutating() <= 1) return qc.invalidateQueries({ queryKey: ["tasks"] });
  };
  const optimistic = async (fn: (list: Task[]) => Task[]) => {
    await qc.cancelQueries({ queryKey: KEY });
    const prev = tasksNow();
    setTasks(fn);
    return prev;
  };

  const add = useMutation({
    mutationFn: (v: TaskInput & { id: string }) => api("/tasks", { method: "POST", body: JSON.stringify(v) }),
    onMutate: (v) =>
      optimistic((list) => [
        ...list,
        {
          id: v.id,
          title: v.title,
          assignee: v.assignee,
          dueDate: v.dueDate ?? undefined,
          categoryId: v.categoryId ?? undefined,
          position: generateKeyBetween(lastPosition(list.filter((t) => (t.categoryId ?? null) === v.categoryId)), null),
          done: false,
          createdAt: new Date().toISOString(),
        },
      ]),
    onError: rollback,
    onSettled: settle,
  });

  const apply = (t: Task, patch: TaskPatch): Task => {
    const next: Task = {
      ...t,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.assignee !== undefined ? { assignee: patch.assignee } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      dueDate: patch.dueDate === null ? undefined : (patch.dueDate ?? t.dueDate),
      categoryId: patch.categoryId === null ? undefined : (patch.categoryId ?? t.categoryId),
    };
    if (patch.done === true) {
      const now = new Date();
      Object.assign(next, { done: true, doneAt: now.toISOString(), doneBy: getStoredProfile() ?? undefined, expireAt: new Date(now.getTime() + DONE_VISIBLE_MS).toISOString() });
    } else if (patch.done === false) Object.assign(next, { done: false, doneAt: undefined, doneBy: undefined, expireAt: undefined });
    return next;
  };

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch; prev?: Task[] }) => api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onMutate: ({ id, patch, prev }) => (prev ? Promise.resolve(prev) : optimistic((list) => list.map((t) => (t.id === id ? apply(t, patch) : t)))),
    onError: rollback,
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/tasks/${id}`, { method: "DELETE" }),
    onMutate: (id) => optimistic((list) => list.filter((t) => t.id !== id)),
    onError: rollback,
    onSettled: settle,
  });

  const categories = useMutation({
    mutationFn: (v: { kind: "create"; id: string; name: string } | { kind: "rename"; id: string; name: string } | { kind: "delete"; id: string }) =>
      v.kind === "create"
        ? api("/task-categories", { method: "POST", body: JSON.stringify({ id: v.id, name: v.name }) })
        : v.kind === "rename"
          ? api(`/task-categories/${v.id}`, { method: "PATCH", body: JSON.stringify({ name: v.name }) })
          : api(`/task-categories/${v.id}`, { method: "DELETE" }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: CATS_KEY });
      const prev = qc.getQueryData<TaskCategory[]>(CATS_KEY) ?? [];
      qc.setQueryData<TaskCategory[]>(CATS_KEY, (old = []) =>
        v.kind === "create"
          ? [...old, { id: v.id, name: v.name, position: generateKeyBetween(lastPosition(old), null) }]
          : v.kind === "rename"
            ? old.map((c) => (c.id === v.id ? { ...c, name: v.name } : c))
            : old.filter((c) => c.id !== v.id),
      );
      return prev;
    },
    onError: (_e, _v, prev) => prev && qc.setQueryData(CATS_KEY, prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return {
    add: (input: TaskInput) => add.mutate({ ...input, id: newObjectId() }),
    toggle: (t: Task) => update.mutate({ id: t.id, patch: { done: !t.done } }),
    edit: (id: string, input: TaskInput) => update.mutate({ id, patch: input }),
    /** Glisser-déposer : appliqué dans le même rendu que le lâcher (voir ShoppingList), puis envoyé. */
    move: (id: string, categoryId: string | null, position: string) => {
      const prev = tasksNow();
      void qc.cancelQueries({ queryKey: KEY });
      setTasks((list) => list.map((t) => (t.id === id ? apply(t, { categoryId, position }) : t)));
      update.mutate({ id, patch: { categoryId, position }, prev });
    },
    remove: (id: string) => remove.mutate(id),
    createCategory: (name: string) => categories.mutate({ kind: "create", id: newObjectId(), name }),
    renameCategory: (id: string, name: string) => categories.mutate({ kind: "rename", id, name }),
    deleteCategory: (id: string) => categories.mutate({ kind: "delete", id }),
  };
}
