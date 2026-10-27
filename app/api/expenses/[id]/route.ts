import { isObjectId, json, readJson, withProfile } from "@/lib/auth/server";
import { categoryExists, deleteExpense, getExpense, updateExpense } from "@/lib/money/server";
import { ExpenseBody } from "@/lib/money/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => json({ error: "not_found" }, 404);

export const GET = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  const expense = await getExpense(id, profile);
  return expense ? json({ expense }) : notFound();
});

// Les deux profils modifient les dépenses communes ; une dépense perso, seulement son propriétaire.
export const PATCH = withProfile<Ctx>(async (req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  const body = ExpenseBody.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!(await categoryExists(body.data.categoryId))) return json({ error: "category" }, 400);
  const expense = await updateExpense(id, body.data, profile);
  return expense ? json({ expense }) : notFound();
});

export const DELETE = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return notFound();
  return (await deleteExpense(id, profile)) ? json({ ok: true }) : notFound();
});
