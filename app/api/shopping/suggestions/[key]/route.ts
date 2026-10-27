import { z } from "zod";
import { json, readJson, withProfile } from "@/lib/auth/server";
import { hideSuggestion } from "@/lib/shopping/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ key: string }> };

const Patch = z.object({ hidden: z.literal(true) });

// Retirer une suggestion indésirable (appui long sur la suggestion).
export const PATCH = withProfile<Ctx>(async (req, { params }, profile) => {
  const key = decodeURIComponent((await params).key);
  if (!Patch.safeParse(await readJson(req)).success) return json({ error: "invalid" }, 400);
  return (await hideSuggestion(key, profile)) ? json({ ok: true }) : json({ error: "not_found" }, 404);
});
