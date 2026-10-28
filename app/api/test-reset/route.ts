import { json, withProfile } from "@/lib/auth/server";
import { getDb } from "@/lib/db/mongo";
import { publishChange } from "@/lib/realtime/server";
import type { ChangeType } from "@/lib/realtime/types";

export const dynamic = "force-dynamic";

// TEMPORAIRE, pour la période de tests : efface toutes les données, sauf les catégories par défaut
// et les téléphones connectés. À retirer avant l'usage réel (avec le bouton du menu de l'avatar).
const DATA = ["shopping_items", "item_history", "expenses", "settlements", "budgets", "tasks", "bills"];
const TYPES: ChangeType[] = ["shopping", "history", "expenses", "settlements", "categories", "budgets", "tasks", "bills"];

export const POST = withProfile(async (_req, _ctx, profile) => {
  const db = await getDb();
  await Promise.all(DATA.map((name) => db.collection(name).deleteMany({})));
  await db.collection("categories").deleteMany({ isDefault: { $ne: true } });
  await Promise.all(TYPES.map((t) => publishChange(t, profile)));
  return json({ ok: true });
});
