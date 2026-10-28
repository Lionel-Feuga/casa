import { z } from "zod";
import { isDay } from "@/lib/domain/dates";
import { PROFILES } from "@/lib/domain/profile";

const assignee = z.enum([...PROFILES, "both"]);
const dueDate = z.string().refine(isDay).nullable();

// Ajout et modification d'une tâche (section 7)
export const TaskCreate = z.object({
  id: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  title: z.string().trim().min(1).max(160),
  assignee,
  dueDate: dueDate.default(null),
});

export const TaskPatch = z
  .object({ title: z.string().trim().min(1).max(160).optional(), assignee: assignee.optional(), dueDate: dueDate.optional(), done: z.boolean().optional() })
  .refine((p) => Object.values(p).some((v) => v !== undefined));
