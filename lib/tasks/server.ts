import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { ObjectId, type Filter } from "mongodb";
import { taskCategories, tasks, type TaskCategoryDoc, type TaskDoc } from "@/lib/db/collections";
import { dateToDay, dayToDate, type Day } from "@/lib/domain/dates";
import type { Profile } from "@/lib/domain/profile";
import { cleanName } from "@/lib/domain/shopping";
import { DONE_VISIBLE_MS, TASK_CATEGORY_NAME_MAX, TASK_TITLE_MAX, type Assignee, type Task, type TaskCategory } from "@/lib/domain/tasks";
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
  categoryId: d.categoryId?.toHexString(),
  position: d.position ?? "",
  createdAt: d.createdAt.toISOString(),
});

const toCategory = (d: TaskCategoryDoc): TaskCategory => ({ id: d._id.toHexString(), name: d.name, position: d.position });

const notExpired = (now: Date): Filter<TaskDoc> => ({ $or: [{ expireAt: { $exists: false } }, { expireAt: { $gt: now } }] });

/** Dernière position d'une catégorie (null pour « Sans catégorie »), pour ajouter en bas. */
async function positionAtEnd(categoryId: ObjectId | null): Promise<string> {
  const last = await (await tasks())
    .find({ categoryId: categoryId ?? { $exists: false }, position: { $exists: true } }, { projection: { position: 1 } })
    .sort({ position: -1 })
    .limit(1)
    .next();
  return generateKeyBetween(last?.position ?? null, null);
}

export async function listTasks(): Promise<Task[]> {
  const col = await tasks();
  // L'index TTL passe environ une fois par minute : on cache aussi ce qui vient d'expirer.
  const docs = await col.find(notExpired(new Date())).sort({ createdAt: 1 }).toArray();
  // Tâches créées avant les catégories : on leur donne une position, dans leur ordre de création.
  const missing = docs.filter((d) => !d.position);
  if (missing.length) {
    const max = docs.reduce<string | null>((m, d) => (d.position && (!m || d.position > m) ? d.position : m), null);
    const keys = generateNKeysBetween(max, null, missing.length);
    missing.forEach((d, i) => (d.position = keys[i]));
    await col.bulkWrite(missing.map((d) => ({ updateOne: { filter: { _id: d._id }, update: { $set: { position: d.position } } } })));
  }
  return docs.map(toTask);
}

export interface TaskInput {
  title: string;
  assignee: Assignee;
  dueDate: Day | null;
  categoryId: string | null;
}

export async function createTask(input: TaskInput, by: Profile, id?: string): Promise<Task> {
  const categoryId = input.categoryId ? new ObjectId(input.categoryId) : null;
  const doc: TaskDoc = {
    _id: id ? new ObjectId(id) : new ObjectId(),
    title: cleanName(input.title).slice(0, TASK_TITLE_MAX),
    assignee: input.assignee,
    ...(input.dueDate ? { dueDate: dayToDate(input.dueDate) } : {}),
    ...(categoryId ? { categoryId } : {}),
    position: await positionAtEnd(categoryId),
    done: false,
    createdBy: by,
    createdAt: new Date(),
  };
  await (await tasks()).updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
  await publishChange("tasks", by);
  return toTask(doc);
}

export type TaskPatch = Partial<TaskInput> & { done?: boolean; position?: string };

export async function updateTask(id: string, patch: TaskPatch, by: Profile): Promise<Task | null> {
  const $set: Partial<TaskDoc> = {};
  const $unset: Record<string, ""> = {};
  if (patch.title !== undefined) $set.title = cleanName(patch.title).slice(0, TASK_TITLE_MAX);
  if (patch.assignee !== undefined) $set.assignee = patch.assignee;
  if (patch.dueDate === null) $unset.dueDate = "";
  else if (patch.dueDate !== undefined) $set.dueDate = dayToDate(patch.dueDate);
  if (patch.categoryId !== undefined) {
    const categoryId = patch.categoryId ? new ObjectId(patch.categoryId) : null;
    if (categoryId) $set.categoryId = categoryId;
    else $unset.categoryId = "";
    // Changée de catégorie depuis le formulaire : elle va en bas de la nouvelle.
    if (patch.position === undefined) {
      const current = await (await tasks()).findOne({ _id: new ObjectId(id) }, { projection: { categoryId: 1 } });
      if (current && String(current.categoryId ?? "") !== String(categoryId ?? "")) $set.position = await positionAtEnd(categoryId);
    }
  }
  if (patch.position !== undefined) $set.position = patch.position;
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

// ---------- Catégories de tâches ----------

export async function listTaskCategories(): Promise<TaskCategory[]> {
  return (await (await taskCategories()).find().sort({ position: 1 }).toArray()).map(toCategory);
}

export async function createTaskCategory(rawName: string, by: Profile, id?: string): Promise<TaskCategory | null> {
  const name = cleanName(rawName).slice(0, TASK_CATEGORY_NAME_MAX);
  if (!name) return null;
  const col = await taskCategories();
  const last = await col.find().sort({ position: -1 }).limit(1).next();
  const doc: TaskCategoryDoc = { _id: id ? new ObjectId(id) : new ObjectId(), name, position: generateKeyBetween(last?.position ?? null, null), createdAt: new Date() };
  await col.updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
  await publishChange("tasks", by);
  return toCategory(doc);
}

export async function renameTaskCategory(id: string, rawName: string, by: Profile): Promise<TaskCategory | null> {
  const name = cleanName(rawName).slice(0, TASK_CATEGORY_NAME_MAX);
  if (!name) return null;
  const doc = await (await taskCategories()).findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { name } }, { returnDocument: "after" });
  if (!doc) return null;
  await publishChange("tasks", by);
  return toCategory(doc);
}

/** Supprimer une catégorie garde ses tâches : elles passent dans « Sans catégorie », en bas. */
export async function deleteTaskCategory(id: string, by: Profile): Promise<boolean> {
  const _id = new ObjectId(id);
  const res = await (await taskCategories()).deleteOne({ _id });
  if (!res.deletedCount) return false;
  const col = await tasks();
  const moved = await col.find({ categoryId: _id }).sort({ position: 1 }).toArray();
  if (moved.length) {
    const start = await positionAtEnd(null);
    const keys = generateNKeysBetween(start, null, moved.length);
    await col.bulkWrite(moved.map((d, i) => ({ updateOne: { filter: { _id: d._id }, update: { $set: { position: keys[i] }, $unset: { categoryId: "" } } } })));
  }
  await publishChange("tasks", by);
  return true;
}
