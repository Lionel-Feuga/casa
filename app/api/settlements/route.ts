import { json, withDevice, withProfile } from "@/lib/auth/server";
import { currentMonth, isMonth } from "@/lib/domain/dates";
import { listSettlements, settle } from "@/lib/money/server";

export const dynamic = "force-dynamic";

export const GET = withDevice(async (req) => {
  const month = new URL(req.url).searchParams.get("month") ?? currentMonth();
  if (!isMonth(month)) return json({ error: "invalid" }, 400);
  return json({ settlements: await listSettlements(month) });
});

// « Régler » : toujours le solde entier, calculé ici (section 5.4).
export const POST = withProfile(async (_req, _ctx, profile) => {
  const settlement = await settle(profile);
  return settlement ? json({ settlement }, 201) : json({ error: "nothing_due" }, 409);
});
