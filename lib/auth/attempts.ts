// Protection contre les essais (section 2.1) : 5 codes faux de suite bloquent 15 minutes.
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60 * 1000;

export interface AttemptState {
  failures: number;
  lockedUntil?: Date;
  expireAt: Date;
}

export function isLocked(state: AttemptState | null | undefined, now: Date): boolean {
  return !!state?.lockedUntil && state.lockedUntil > now;
}

export function afterFailure(prev: AttemptState | null | undefined, now: Date): AttemptState {
  // Un blocage terminé repart de zéro, même si l'index TTL n'a pas encore supprimé le document.
  const stale = !prev || (prev.lockedUntil && prev.lockedUntil <= now) || prev.expireAt <= now;
  const failures = (stale ? 0 : prev.failures) + 1;
  if (failures >= MAX_FAILURES) {
    const lockedUntil = new Date(now.getTime() + LOCK_MS);
    return { failures, lockedUntil, expireAt: lockedUntil };
  }
  return { failures, expireAt: new Date(now.getTime() + LOCK_MS) };
}
