import { describe, expect, it } from "vitest";
import { afterFailure, isLocked, LOCK_MS, type AttemptState } from "./attempts";

const t0 = new Date("2026-10-27T10:00:00Z");
const at = (ms: number) => new Date(t0.getTime() + ms);

describe("essais du code", () => {
  it("bloque après 5 codes faux de suite, pendant 15 minutes", () => {
    let s: AttemptState | null = null;
    for (let i = 0; i < 4; i++) {
      s = afterFailure(s, at(i * 1000));
      expect(isLocked(s, at(i * 1000))).toBe(false);
    }
    s = afterFailure(s, at(5000));
    expect(isLocked(s, at(5000))).toBe(true);
    expect(isLocked(s, at(5000 + LOCK_MS - 1))).toBe(true);
    expect(isLocked(s, at(5000 + LOCK_MS))).toBe(false);
  });

  it("repart de zéro après la fin du blocage", () => {
    let s: AttemptState | null = null;
    for (let i = 0; i < 5; i++) s = afterFailure(s, t0);
    s = afterFailure(s, at(LOCK_MS + 1));
    expect(s.failures).toBe(1);
    expect(isLocked(s, at(LOCK_MS + 1))).toBe(false);
  });
});
