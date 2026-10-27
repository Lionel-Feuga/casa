export const PROFILES = ["lionel", "jaz"] as const;
export type Profile = (typeof PROFILES)[number];

export const PROFILE_LABEL: Record<Profile, string> = { lionel: "Lionel", jaz: "Jaz" };
export const PROFILE_INITIAL: Record<Profile, "L" | "J"> = { lionel: "L", jaz: "J" };

export function isProfile(v: unknown): v is Profile {
  return v === "lionel" || v === "jaz";
}

export function otherProfile(p: Profile): Profile {
  return p === "lionel" ? "jaz" : "lionel";
}
