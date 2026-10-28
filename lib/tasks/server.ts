import { ObjectId } from "mongodb";
import { tasks, type TaskDoc } from "@/lib/db/collections";
import { dateToDay, dayToDate, type Day } from "@/lib/domain/dates";
import type { Profile } from "@/lib/domain/profile";
import { cleanName } from "@/lib/domain/shopping";
import { DONE_VISIBLE_MS, TASK_TITLE_MAX, type Assignee, type Task } from "@/lib/domain/tasks";
import { publishChange } from "@/lib/realtime/server";

const toTask = (d: TaskDoc): Task => ({
  id: d._id.toHexString(),
  title: d.title,
  assignee: d.assignee,
  dueDate: d.dueDate ? dateToDay(d.dueDate) : undefined,
  done: d.done,
  doneAt: d.doneAt?.toISOString(),
  doneBy: d.doneBy,
  expireAt: d.expireAt?.toISOString(),
  createdAt: d.createdAt.toISOString(),
});

export async function listTasks(): Promise<Task[]> {
  const now = new Date();
  // L'index TTL passe environ une fois par minute : on cache aussi ce qui vient d'expirer.
  const docs = await (await tasks()).find({ $or: [{ expireAt: { $exists: false } }, { expireAt: { $gt: now } }] }).toArray();
  return docs.map(toTask);
}

export interface TaskInput {
  title: string;
  assignee: Assignee;
  dueDate: Day | null;
}

export async function createTask(input: TaskInput, by: Profile, id?: string): Promise<Task> {
  const doc: TaskDoc = {
    _id: id ? new ObjectId(id) : new ObjectId(),
    title: cleanName(input.title).slice(0, TASK_TITLE_MAX),
    assignee: input.assignee,
    ...(input.dueDate ? { dueDate: dayToDate(input.dueDate) } : {}),
    done: false,
    createdBy: by,
    createdAt: new Date(),
  };
  await (await tasks()).updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
  await publishChange("tasks", by);
  return toTask(doc);
}

export async function updateTask(id: string, patch: Partial<TaskInput> & { done?: boolean }, by: Profile): Promise<Task | null> {
  const $set: Partial<TaskDoc> = {};
  const $unset: Record<string, ""> = {};
  if (patch.title !== undefined) $set.title = cleanName(patch.title).slice(0, TASK_TITLE_MAX);
  if (patch.assignee !== undefined) $set.assignee = patch.assignee;
  if (patch.dueDate === null) $unset.dueDate = "";
  else if (patch.dueDate !== undefined) $set.dueDate = dayToDate(patch.dueDate);
  if (patch.done === true) {
    const now = new Date();
    Object.assign($set, { done: true, doneAt: now, doneBy: by, expireAt: new Date(now.getTime() + DONE_VISIBLE_MS) });
  } else if (patch.done === false) {
    // Décocher retire expireAt (section 7).
    $set.done = false;
    Object.assign($unset, { doneAt: "", doneBy: "", expireAt: "" });
  }
  const doc = await (await tasks()).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
    { returnDocument: "after" },
  );
  if (!doc) return null;
  await publishChange("tasks", by);
  return toTask(doc);
}

export async function deleteTask(id: string, by: Profile): Promise<boolean> {
  const res = await (await tasks()).deleteOne({ _id: new ObjectId(id) });
  if (res.deletedCount) await publishChange("tasks", by);
  return res.deletedCount > 0;
}
