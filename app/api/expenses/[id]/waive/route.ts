import { isObjectId, json, withProfile } from "@/lib/auth/server";
import { waiveDebt } from "@/lib/money/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// « Retirer » sur une ligne des détails du solde : la dépense ne crée plus de part due.
export const POST = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "not_found" }, 404);
  return (await waiveDebt(id, profile)) ? json({ ok: true }) : json({ error: "not_found" }, 404);
});
