"use client";

import { Share } from "lucide-react";
import { useEffect, useState } from "react";
import { readLocal, writeLocal } from "@/lib/client/storage";

const KEY = "casa.installHint";

function isIphoneInSafari(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !installed;
}

// Aide à l'installation (section 10.8) : sur iPhone seulement, tant que l'appli n'est pas installée.
export function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(isIphoneInSafari() && readLocal(KEY) !== "vu"), []);
  if (!show) return null;
  return (
    <aside className="card hint-card" aria-label="Installer Casa">
      <b>Installe Casa sur ton iPhone</b>
      <p>
        Dans Safari, touche <Share size={16} strokeWidth={2.6} aria-label="Partager" /> puis « Sur l’écran d’accueil ». Tu entreras le code une fois dans
        l’appli installée.
      </p>
      <button
        type="button"
        className="btn"
        onClick={() => {
          writeLocal(KEY, "vu");
          setShow(false);
        }}
      >
        Compris
      </button>
    </aside>
  );
}
