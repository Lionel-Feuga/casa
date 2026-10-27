import { z } from "zod";
import { isDay } from "@/lib/domain/dates";
import { MAX_AMOUNT_CENTS } from "@/lib/domain/money";
import { PROFILES } from "@/lib/domain/profile";

// Règles du formulaire de dépense (section 5.1), vérifiées aussi côté serveur.
export const ExpenseBody = z.object({
  label: z.string().trim().min(1).max(60),
  amountCents: z.number().int().positive().max(MAX_AMOUNT_CENTS),
  categoryId: z.string().regex(/^[0-9a-f]{24}$/i),
  scope: z.enum(["shared", "personal"]),
  paidBy: z.enum(PROFILES),
  date: z.string().refine(isDay),
  source: z.enum(["manual", "ticket"]).optional(),
});
