import { z } from "zod";
import { isDay } from "@/lib/domain/dates";
import { MAX_AMOUNT_CENTS } from "@/lib/domain/money";
import { PROFILES } from "@/lib/domain/profile";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);
const amount = z.number().int().positive().max(MAX_AMOUNT_CENTS);
const day = z.string().refine(isDay);

// Formulaire de facture (section 8.1)
export const BillBody = z.object({
  label: z.string().trim().min(1).max(60),
  amountCents: amount,
  categoryId: objectId,
  scope: z.enum(["shared", "personal"]),
  kind: z.enum(["recurring", "once"]),
  every: z.enum(["month", "year"]).optional(),
  dueDate: day,
});

// Feuille « Marquer payé » (section 8.2)
export const PayBody = z.object({
  amountCents: amount,
  date: day,
  paidBy: z.enum([...PROFILES, "both"]),
});
