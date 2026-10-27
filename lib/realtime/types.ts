import type { Profile } from "@/lib/domain/profile";

export const CHANNEL = "casa";

export type ChangeType = "shopping" | "history" | "expenses" | "settlements" | "categories" | "budgets" | "tasks" | "bills";

// Message court publié après chaque écriture (section 10.6). Aucune donnée privée.
export interface ChangeMessage {
  type: ChangeType;
  by: Profile;
}
