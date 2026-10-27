import { z } from "zod";
import { json, readJson, withProfile } from "@/lib/auth/server";
import { getBudgetMonth, setLimit } from "@/lib/budgets/server";
import { currentMonth, isMonth } from "@/lib/domain/dates";
import { MAX_AMOUNT_CENTS } from "@/lib/domain/money";
import { categoryExists } from "@/lib/money/server";

export const dynamic = "force-dynamic";

// view=shared pour le Commun, view=me pour le perso du profil envoyé dans X-Profile (section 12).
export const GET = withProfile(async (req, _ctx, profile) => {
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? currentMonth();
  const view = url.searchParams.get("view") === "me" ? profile : "shared";
  if (!isMonth(month)) return json({ error: "invalid" }, 400);
  return json(await getBudgetMonth(month, view, profile));
});

const Put = z.object({
  view: z.enum(["shared", "me"]),
  categoryId: z.string().regex(/^[0-9a-f]{24}$/i),
  limitCents: z.number().int().positive().max(MAX_AMOUNT_CENTS).nullable(),
});

export const PUT = withProfile(async (req, _ctx, profile) => {
  const body = Put.safeParse(await readJson(req));
  if (!body.success) return json({ error: "invalid" }, 400);
  if (!(await categoryExists(body.data.categoryId))) return json({ error: "category" }, 400);
  await setLimit(body.data.categoryId, body.data.view === "me" ? profile : "shared", body.data.limitCents, profile);
  return json({ ok: true });
});
