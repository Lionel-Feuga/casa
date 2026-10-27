"use client";

import { Gauge, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { PROFILE_INITIAL, PROFILE_LABEL } from "@/lib/domain/profile";
import { Icon } from "./Icon";
import { useSession } from "./Providers";
import { Sheet } from "./Sheet";
import { ThemeSheet } from "./ThemeSheet";

// Menu de l'avatar (section 2.2) : profil, thème, catégories et plafonds.
export function AvatarMenu() {
  const { profile } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState<null | "menu" | "theme">(null);
  const close = useCallback(() => setOpen(null), []);
  if (!profile) return null;
  const initial = PROFILE_INITIAL[profile];

  return (
    <>
      <button type="button" className="avatar" aria-label={`Menu de ${PROFILE_LABEL[profile]}`} onClick={() => setOpen("menu")}>
        <span className={`bg-${initial}`}>{initial}</span>
      </button>
      {open === "menu" && (
        <Sheet title="Menu" onClose={close}>
          <h3>Salut {PROFILE_LABEL[profile]}</h3>
          <div className="menu">
            <button type="button" className="btn" onClick={() => router.push("/profil")}>
              <Icon name="swap" />
              Changer de profil
            </button>
            <button type="button" className="btn" onClick={() => setOpen("theme")}>
              <Icon name="palette" />
              Thème
            </button>
            <button type="button" className="btn" onClick={() => router.push("/reglages/categories")}>
              <Tags size={20} strokeWidth={2.6} aria-hidden="true" />
              Gérer les catégories
            </button>
            <button type="button" className="btn" onClick={() => router.push("/reglages/budgets")}>
              <Gauge size={20} strokeWidth={2.6} aria-hidden="true" />
              Gérer les budgets
            </button>
          </div>
        </Sheet>
      )}
      {open === "theme" && <ThemeSheet onClose={close} />}
    </>
  );
}
