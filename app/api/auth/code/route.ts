import { z } from "zod";
import { checkAccessCode, clientIp, json } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const Body = z.object({ code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "wrong" }, 400);
  try {
    const res = await checkAccessCode(parsed.data.code, clientIp(req));
    if (res.ok) return json({ token: res.token });
    if (res.reason === "locked") return json({ error: "locked", lockedUntil: res.lockedUntil }, 429);
    return json({ error: "wrong" }, 401);
  } catch (err) {
    console.error(err);
    return json({ error: "server" }, 500);
  }
}
