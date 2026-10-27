import { json, withProfile } from "@/lib/auth/server";
import { clearChecked } from "@/lib/shopping/server";

export const dynamic = "force-dynamic";

// Vider le panier : supprime tous les articles cochés (l'historique des suggestions est conservé).
export const DELETE = withProfile(async (_req, _ctx, profile) => json({ deleted: await clearChecked(profile) }));
