import { z } from "zod";
import { isObjectId, json, readJson, withProfile } from "@/lib/auth/server";
import { deleteItem, updateItem } from "@/lib/shopping/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z
  .object({ checked: z.boolean().optional(), position: z.string().min(1).max(200).optional() })
  .refine((p) => p.checked !== undefined || p.position !== undefined);

export const PATCH = withProfile<Ctx>(async (req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "not_found" }, 404);
  const patch = Patch.safeParse(await readJson(req));
  if (!patch.success) return json({ error: "invalid" }, 400);
  const item = await updateItem(id, patch.data, profile);
  return item ? json({ item }) : json({ error: "not_found" }, 404);
});

export const DELETE = withProfile<Ctx>(async (_req, { params }, profile) => {
  const { id } = await params;
  if (!isObjectId(id)) return json({ error: "not_found" }, 404);
  const item = await deleteItem(id, profile);
  return item ? json({ item }) : json({ error: "not_found" }, 404);
});
