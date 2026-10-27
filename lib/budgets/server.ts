import { ObjectId } from "mongodb";
import { budgets, expenses } from "@/lib/db/collections";
import { computeBudget, type BudgetLine, type BudgetView } from "@/lib/domain/budgets";
import { monthRange, type Month } from "@/lib/domain/dates";
import type { Profile } from "@/lib/domain/profile";
import { listCategories, visibleTo } from "@/lib/money/server";
import { publishChange } from "@/lib/realtime/server";

export interface BudgetMonth {
  month: Month;
  view: BudgetView;
  lines: BudgetLine[];
  totalCents: number;
  sharedPartCents: number;
  personalCents: number;
}

/** Budgets d'un mois pour une vue (section 6.2). La vue perso est toujours celle du profil qui demande. */
export async function getBudgetMonth(month: Month, view: BudgetView, viewer: Profile): Promise<BudgetMonth> {
  if (view !== "shared" && view !== viewer) throw new Error("Vue perso d'un autre profil");
  const { start, end } = monthRange(month);
  const [cats, docs, limits] = await Promise.all([
    listCategories(),
    (await expenses())
      .find({ ...visibleTo(viewer), date: { $gte: start, $lt: end } }, { projection: { categoryId: 1, amountCents: 1, scope: 1, paidBy: 1, owner: 1 } })
      .toArray(),
    (await budgets()).find({ view }).toArray(),
  ]);
  const limitMap = Object.fromEntries(limits.map((b) => [b.categoryId.toHexString(), b.monthlyLimitCents]));
  const result = computeBudget(
    docs.map((d) => ({ categoryId: d.categoryId.toHexString(), amountCents: d.amountCents, scope: d.scope, paidBy: d.paidBy, owner: d.owner })),
    view,
    cats.map((c) => c.id),
    limitMap,
  );
  return { month, view, ...result };
}

/** Plafond mensuel d'une catégorie pour une vue, ou null pour « sans plafond » (section 6.3). */
export async function setLimit(categoryId: string, view: BudgetView, limitCents: number | null, by: Profile): Promise<void> {
  const col = await budgets();
  const filter = { categoryId: new ObjectId(categoryId), view };
  if (limitCents === null) await col.deleteOne(filter);
  else await col.updateOne(filter, { $set: { monthlyLimitCents: limitCents } }, { upsert: true });
  await publishChange("budgets", by);
}
