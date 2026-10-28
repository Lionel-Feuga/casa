import { json, readJson, withProfile } from "@/lib/auth/server";
import { isMonth } from "@/lib/domain/dates";
import { categoryExists, createExpense, listExpenses } from "@/lib/money/server";
import { ExpenseBody } from "@/lib/money/validation";

export const dynamic = "force-dynamic";

// Filtres month=AAAA-MM et scope=shared|personal. Les dépenses perso ne sont renvoyées qu'à leur propriétaire.
export const GET = withProfile(async (req, _ctx, profile) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? undefined;
  const scope = url.searchParams.get("scope") ?? undefined;
  if (month && !isMonth(month)) return json({ error: "invalid" }, 400);
  if (scope && scope !== "shared" && scope !== "personal") return json({ error: "invalid" }, 400);
  return json({ expenses: await listExpenses(profile, { month, scope: scope as "shared" | "personal" | undefined }) });
});

export const POST = withProfile(async (req, _ctx, profile) => {
  const body = ExpenseBody.safeParse(await readJson(req));
  if (!body.success || body.data.paidBy === "both") return json({ error: "invalid" }, 400);
  if (!(await categoryExists(body.data.categoryId))) return json({ error: "category" }, 400);
  return json({ expense: await createExpense(body.data, profile) }, 201);
});
