import { isObjectId, json, withProfile } from "@/lib/auth/server";
import { deleteSettlement } from "@/lib/money/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Annuler un règlement.
export const DELETE = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "not_found" }, 404);
  return (await deleteSettlement(id, profile)) ? json({ ok: true }) : json({ error: "not_found" }, 404);
});
