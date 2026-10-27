import { z } from "zod";
import { json, readJson, withDevice, withProfile } from "@/lib/auth/server";
import { PROFILES } from "@/lib/domain/profile";
import { ITEM_NAME_MAX } from "@/lib/domain/shopping";
import { addItem, listItems, restoreItem } from "@/lib/shopping/server";

export const dynamic = "force-dynamic";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);

const Add = z.object({
  id: objectId.optional(),
  name: z.string().max(ITEM_NAME_MAX * 2),
});

// Annulation d'une suppression : l'article complet revient.
const Restore = z.object({
  restore: z.object({
    id: objectId,
    name: z.string().min(1).max(ITEM_NAME_MAX * 2),
    position: z.string().min(1).max(200),
    checked: z.boolean(),
    checkedAt: z.string().datetime().optional(),
    checkedBy: z.enum(PROFILES).optional(),
    addedBy: z.enum(PROFILES),
    createdAt: z.string().datetime(),
  }),
});

export const GET = withDevice(async () => json({ items: await listItems() }));

export const POST = withProfile(async (req, _ctx, profile) => {
  const body = await readJson(req);
  const restore = Restore.safeParse(body);
  if (restore.success) return json({ status: "restored", item: await restoreItem(restore.data.restore, profile) });

  const add = Add.safeParse(body);
  if (!add.success) return json({ error: "invalid" }, 400);
  const res = await addItem(add.data.name, profile, add.data.id);
  if (res.status === "empty") return json({ error: "empty" }, 400);
  return json(res, res.status === "added" ? 201 : 200);
});
