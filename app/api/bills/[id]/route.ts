import { isObjectId, json, readJson, withProfile } from "@/lib/auth/server";
import { deleteBill, getBill, updateBill } from "@/lib/bills/server";
import { BillBody } from "@/lib/bills/validation";
import { categoryExists } from "@/lib/money/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => json({ error: "not_found" }, 404);

export const GET = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  const bill = await getBill(id, profile);
  return bill ? json({ bill }) : notFound();
});

export const PATCH = withProfile<Ctx>(async (req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  const body = BillBody.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!(await categoryExists(body.data.categoryId))) return json({ error: "category" }, 400);
  const bill = await updateBill(id, body.data, profile);
  return bill ? json({ bill }) : notFound();
});

export const DELETE = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  return (await deleteBill(id, profile)) ? json({ ok: true }) : notFound();
});
