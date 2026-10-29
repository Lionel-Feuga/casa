import { isObjectId, json, readJson, withProfile } from "@/lib/auth/server";
import { deleteTaskCategory, renameTaskCategory } from "@/lib/tasks/server";
import { TaskCategoryBody } from "@/lib/tasks/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => json({ error: "not_found" }, 404);

export const PATCH = withProfile<Ctx>(async (req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  const body = TaskCategoryBody.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  const category = await renameTaskCategory(id, body.data.name, profile);
  return category ? json({ category }) : notFound();
});

// Ses tâches passent dans « Sans catégorie ».
export const DELETE = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  return (await deleteTaskCategory(id, profile)) ? json({ ok: true }) : notFound();
});
