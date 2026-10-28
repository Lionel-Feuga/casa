"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { InstallHint } from "@/components/InstallHint";
import { useSession } from "@/components/Providers";
import { api, ApiError, setToken } from "@/lib/client/api";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

const time = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default function CodePage() {
  const router = useRouter();
  const { ready, hasToken, profile, refresh } = useSession();
  const [digits, setDigits] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [shake, setShake] = useState(0);
  const accepted = useRef(false);

  useEffect(() => {
    if (ready && hasToken) router.replace(profile ? "/" : "/profil");
  }, [ready, hasToken, profile, router]);

  // Fin du blocage : le pavé se réactive tout seul.
  useEffect(() => {
    if (!lockedUntil) return;
    const id = window.setTimeout(() => {
      setLockedUntil(null);
      setMsg(null);
    }, Math.max(0, lockedUntil.getTime() - Date.now()));
    return () => window.clearTimeout(id);
  }, [lockedUntil]);

  const submit = useCallback(
    async (code: string) => {
      setBusy(true);
      setMsg(null);
      try {
        const { token } = await api<{ token: string }>("/auth/code", { method: "POST", body: JSON.stringify({ code }) });
        accepted.current = true;
        setToken(token);
        refresh();
        router.replace("/profil");
      } catch (err) {
        setDigits("");
        setShake((n) => n + 1);
        if (err instanceof ApiError && err.code === "locked") {
          const until = new Date(String(err.body.lockedUntil));
          setLockedUntil(until);
          setMsg({ text: `Trop d’essais. Réessaie après ${time(until)}.`, err: true });
        } else if (err instanceof ApiError && err.code === "wrong") {
          setMsg({ text: "Ce n’est pas le bon code.", err: true });
        } else {
          setMsg({ text: "Impossible de vérifier le code. Vérifie le réseau.", err: true });
        }
      } finally {
        setBusy(false);
      }
    },
    [refresh, router],
  );

  const press = useCallback(
    (k: string) => {
      if (busy || lockedUntil) return;
      if (k === "del") {
        setDigits((d) => d.slice(0, -1));
        return;
      }
      setDigits((d) => (d.length >= 6 ? d : d + k));
    },
    [busy, lockedUntil],
  );

  // Envoi automatique au 6e chiffre
  useEffect(() => {
    if (digits.length === 6 && !busy && !accepted.current) void submit(digits);
  }, [digits, busy, submit]);

  // Clavier physique (ordinateur)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const disabled = busy || !!lockedUntil;

  return (
    <div className="app">
      <div className="deco" aria-hidden="true" />
      <main className="code">
        <InstallHint />
        <h1 className="ttl">Code de la maison</h1>
        <p>Entre le code commun pour ouvrir Casa sur ce téléphone.</p>
        <div key={shake} className={`dots${shake ? " shake" : ""}`} aria-label={`${digits.length} chiffres sur 6`} role="img">
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} className={i < digits.length ? "f" : ""} />
          ))}
        </div>
        <p className={`msg${msg?.err ? " err" : ""}`} role="alert">
          {busy ? "Vérification…" : msg?.text}
        </p>
        <div className="pad">
          {KEYS.map((k, i) =>
            k === "" ? (
              <span key={i} />
            ) : (
              <button
                key={k}
                type="button"
                className={`key${k === "del" ? " k" : ""}`}
                disabled={disabled}
                onClick={() => press(k)}
                aria-label={k === "del" ? "Effacer" : k}
              >
                {k === "del" ? "Effacer" : k}
              </button>
            ),
          )}
        </div>
      </main>
    </div>
  );
}
