import { json, requestProfile, withDevice } from "@/lib/auth/server";
import { ablyRest } from "@/lib/realtime/server";
import { CHANNEL } from "@/lib/realtime/types";

export const dynamic = "force-dynamic";

// Jeton Ably temporaire : abonnement et présence sur le canal casa, jamais de publication.
export const GET = withDevice(async (req) => {
  const rest = ablyRest();
  if (!rest) return json({ error: "realtime_disabled" }, 503);
  const profile = requestProfile(req);
  if (!profile) return json({ error: "profile" }, 400);
  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: profile,
    capability: { [CHANNEL]: ["subscribe", "presence"] },
    ttl: 60 * 60 * 1000,
  });
  return json(tokenRequest);
});
