import Ably from "ably";
import type { Profile } from "@/lib/domain/profile";
import { CHANNEL, type ChangeMessage, type ChangeType } from "./types";

const globalForAbly = globalThis as unknown as { _casaAbly?: Ably.Rest };

export function ablyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  globalForAbly._casaAbly ??= new Ably.Rest({ key });
  return globalForAbly._casaAbly;
}

// À appeler après chaque écriture réussie. Une panne d'Ably ne fait jamais échouer l'écriture.
export async function publishChange(type: ChangeType, by: Profile): Promise<void> {
  const rest = ablyRest();
  if (!rest) return;
  const data: ChangeMessage = { type, by };
  try {
    await rest.channels.get(CHANNEL).publish("change", data);
  } catch (err) {
    console.error("Publication Ably impossible", err);
  }
}
