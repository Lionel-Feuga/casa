import { json, withDevice } from "@/lib/auth/server";
import { getBalance } from "@/lib/money/server";

export const dynamic = "force-dynamic";

// Solde net sur tout l'historique, et détail depuis le dernier règlement (section 5.3).
export const GET = withDevice(async () => json(await getBalance()));
