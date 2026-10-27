"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/Providers";
import { PROFILE_LABEL, PROFILES } from "@/lib/domain/profile";

export default function ProfilPage() {
  const router = useRouter();
  const { ready, hasToken, setProfile } = useSession();

  useEffect(() => {
    if (ready && !hasToken) router.replace("/code");
  }, [ready, hasToken, router]);

  if (!ready || !hasToken) return <div className="boot" />;

  return (
    <div className="app">
      <div className="deco" aria-hidden="true" />
      <main className="prof">
        <h1 className="ttl">C’est qui ?</h1>
        <p>Choisis ton profil sur ce téléphone.</p>
        {PROFILES.map((p) => (
          <button
            key={p}
            type="button"
            className={`pc${p === "jaz" ? " j" : ""}`}
            onClick={() => {
              setProfile(p);
              router.replace("/");
            }}
          >
            <span className={`big bg-${p === "lionel" ? "L" : "J"}`}>{p === "lionel" ? "L" : "J"}</span>
            <b>{PROFILE_LABEL[p]}</b>
          </button>
        ))}
        <p className="pfoot">Ce choix reste en mémoire sur ce téléphone. Tu peux le changer en touchant ton avatar.</p>
      </main>
    </div>
  );
}
