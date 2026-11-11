import { isObjectId, json, withProfile } from "@/lib/auth/server";
import { settleExpense } from "@/lib/money/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// « Réglé » sur une ligne des détails du solde : rembourse cette part due seule.
export const POST = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "not_found" }, 404);
  const settlement = await settleExpense(id, profile);
  return settlement ? json({ settlement }, 201) : json({ error: "nothing_due" }, 409);
});
