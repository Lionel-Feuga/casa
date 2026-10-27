import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { devices, loginAttempts } from "@/lib/db/collections";
import { isProfile, type Profile } from "@/lib/domain/profile";
import { afterFailure, isLocked } from "./attempts";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export type CodeResult = { ok: true; token: string } | { ok: false; reason: "wrong" | "locked"; lockedUntil?: Date };

export async function checkAccessCode(code: string, ip: string): Promise<CodeResult> {
  const hash = process.env.ACCESS_CODE_HASH;
  if (!hash) throw new Error("ACCESS_CODE_HASH manquant");
  const attempts = await loginAttempts();
  const now = new Date();
  const prev = await attempts.findOne({ ip });
  if (isLocked(prev, now)) return { ok: false, reason: "locked", lockedUntil: prev!.lockedUntil };

  const good = /^\d{6}$/.test(code) && (await bcrypt.compare(code, hash));
  if (!good) {
    const next = afterFailure(prev, now);
    await attempts.updateOne(
      { ip },
      { $set: next, ...(next.lockedUntil ? {} : { $unset: { lockedUntil: "" } }) },
      { upsert: true },
    );
    return next.lockedUntil ? { ok: false, reason: "locked", lockedUntil: next.lockedUntil } : { ok: false, reason: "wrong" };
  }

  await attempts.deleteOne({ ip });
  const token = randomBytes(32).toString("base64url");
  await (await devices()).insertOne({ tokenHash: hashToken(token), createdAt: now, lastSeenAt: now });
  return { ok: true, token };
}

const SEEN_THROTTLE_MS = 60 * 60 * 1000;

export async function verifyDevice(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token.length < 20) return false;
  const col = await devices();
  const tokenHash = hashToken(token);
  const doc = await col.findOne({ tokenHash }, { projection: { lastSeenAt: 1 } });
  if (!doc) return false;
  const now = new Date();
  if (now.getTime() - doc.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
    await col.updateOne({ tokenHash }, { $set: { lastSeenAt: now } });
  }
  return true;
}

export function requestProfile(req: Request): Profile | null {
  const p = req.headers.get("x-profile");
  return isProfile(p) ? p : null;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export const unauthorized = () => json({ error: "unauthorized" }, 401);

// Enveloppe des routes protégées : 401 sans jeton d'appareil valide.
export function withDevice<C>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      if (!(await verifyDevice(req))) return unauthorized();
      return await handler(req, ctx);
    } catch (err) {
      console.error(err);
      return json({ error: "server" }, 500);
    }
  };
}
