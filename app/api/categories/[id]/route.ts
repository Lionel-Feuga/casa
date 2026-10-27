import { isObjectId, json, withProfile } from "@/lib/auth/server";
import { deleteCategory } from "@/lib/money/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Suppression d'une catégorie créée : dépenses vers Divers, plafonds supprimés.
export const DELETE = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "not_found" }, 404);
  const res = await deleteCategory(id, profile);
  if (res === "not_found") return json({ error: "not_found" }, 404);
  if (res === "protected") return json({ error: "protected" }, 409);
  return json({ ok: true });
});
