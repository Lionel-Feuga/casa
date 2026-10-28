import { isObjectId, json, readJson, withProfile } from "@/lib/auth/server";
import { payBill } from "@/lib/bills/server";
import { PayBody } from "@/lib/bills/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// « Marquer payé » : crée la dépense et avance l'échéance (section 8.2).
export const POST = withProfile<Ctx>(async (req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "not_found" }, 404);
  const body = PayBody.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  const res = await payBill(id, body.data, profile);
  return res ? json(res, 201) : json({ error: "not_found" }, 404);
});
