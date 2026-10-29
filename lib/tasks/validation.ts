import { z } from "zod";
import { isDay } from "@/lib/domain/dates";
import { PROFILES } from "@/lib/domain/profile";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);
const assignee = z.enum([...PROFILES, "both"]);
const dueDate = z.string().refine(isDay).nullable();
const categoryId = objectId.nullable();

// Ajout et modification d'une tâche (section 7)
export const TaskCreate = z.object({
  id: objectId.optional(),
  title: z.string().trim().min(1).max(160),
  assignee,
  dueDate: dueDate.default(null),
  categoryId: categoryId.default(null),
});

export const TaskPatch = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    assignee: assignee.optional(),
    dueDate: dueDate.optional(),
    categoryId: categoryId.optional(),
    position: z.string().min(1).max(200).optional(),
    done: z.boolean().optional(),
  })
  .refine((p) => Object.values(p).some((v) => v !== undefined));

export const TaskCategoryBody = z.object({ id: objectId.optional(), name: z.string().trim().min(1).max(60) });
