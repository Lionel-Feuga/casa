import { z } from "zod";
import { json, readJson, withDevice, withProfile } from "@/lib/auth/server";
import { createCategory, listCategories } from "@/lib/money/server";

export const dynamic = "force-dynamic";

export const GET = withDevice(async () => json({ categories: await listCategories() }));

const Create = z.object({ name: z.string().min(1).max(60) });

// « + Autre » : nouvelle catégorie réutilisable (ou celle qui existe déjà sous ce nom).
export const POST = withProfile(async (req, _ctx, profile) => {
  const body = Create.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  const category = await createCategory(body.data.name, profile);
  return category ? json({ category }) : json({ error: "empty" }, 400);
});
