import { isObjectId, json, readJson, withProfile } from "@/lib/auth/server";
import { deleteTask, updateTask } from "@/lib/tasks/server";
import { TaskPatch } from "@/lib/tasks/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => json({ error: "not_found" }, 404);

// Cocher, décocher ou modifier une tâche
export const PATCH = withProfile<Ctx>(async (req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  const body = TaskPatch.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  const task = await updateTask(id, body.data, profile);
  return task ? json({ task }) : notFound();
});

export const DELETE = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  return (await deleteTask(id, profile)) ? json({ ok: true }) : notFound();
});
