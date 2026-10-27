import { json, withDevice } from "@/lib/auth/server";
import { listSuggestions } from "@/lib/shopping/server";

export const dynamic = "force-dynamic";

// Tout l'historique visible : le téléphone filtre lui-même à chaque lettre tapée, sans attendre le réseau.
export const GET = withDevice(async () => json({ suggestions: await listSuggestions() }));
