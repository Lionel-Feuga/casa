import { json, withDevice } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

// Permet au téléphone de vérifier que son jeton est toujours valable.
export const GET = withDevice(async () => json({ ok: true }));
