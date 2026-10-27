import { isProfile, type Profile } from "@/lib/domain/profile";
import { readLocal, writeLocal } from "./storage";

export const TOKEN_KEY = "casa.token";
export const PROFILE_KEY = "casa.profile";

export const getToken = () => readLocal(TOKEN_KEY);
export const setToken = (t: string | null) => writeLocal(TOKEN_KEY, t);

export function getStoredProfile(): Profile | null {
  const p = readLocal(PROFILE_KEY);
  return isProfile(p) ? p : null;
}
export const setStoredProfile = (p: Profile | null) => writeLocal(PROFILE_KEY, p);

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

// Appel des routes /api : jeton d'appareil et profil dans les en-têtes. Un 401 renvoie à l'écran du code.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  const profile = getStoredProfile();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (profile) headers.set("X-Profile", profile);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`/api${path}`, { ...init, headers, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && path !== "/auth/code") {
    setToken(null);
    if (window.location.pathname !== "/code") window.location.replace("/code");
  }
  if (!res.ok) throw new ApiError(res.status, String(body.error ?? "server"), body);
  return body as T;
}
