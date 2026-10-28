import { json, readJson, withProfile } from "@/lib/auth/server";
import { createBill, listBills } from "@/lib/bills/server";
import { BillBody } from "@/lib/bills/validation";
import { categoryExists } from "@/lib/money/server";

export const dynamic = "force-dynamic";

// Factures à payer visibles par le profil : communes + ses factures perso.
export const GET = withProfile(async (_req, _ctx, profile) => json({ bills: await listBills(profile) }));

export const POST = withProfile(async (req, _ctx, profile) => {
  const body = BillBody.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!(await categoryExists(body.data.categoryId))) return json({ error: "category" }, 400);
  return json({ bill: await createBill(body.data, profile) }, 201);
});
