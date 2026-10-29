import { json, readJson, withDevice, withProfile } from "@/lib/auth/server";
import { createTaskCategory, listTaskCategories } from "@/lib/tasks/server";
import { TaskCategoryBody } from "@/lib/tasks/validation";

export const dynamic = "force-dynamic";

// Catégories de la page À faire, communes à vous deux.
export const GET = withDevice(async () => json({ categories: await listTaskCategories() }));

export const POST = withProfile(async (req, _ctx, profile) => {
  const body = TaskCategoryBody.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  const category = await createTaskCategory(body.data.name, profile, body.data.id);
  return category ? json({ category }, 201) : json({ error: "empty" }, 400);
});
