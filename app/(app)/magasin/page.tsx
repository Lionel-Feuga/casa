"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { useSession } from "@/components/Providers";
import { useShoppingActions, useShoppingItems } from "@/lib/client/shopping";
import { setStatusBar } from "@/lib/client/theme";
import { useWakeLock } from "@/lib/client/useWakeLock";
import { PROFILE_LABEL } from "@/lib/domain/profile";

// Mode magasin (section 3.6) : même ordre que la liste, en très gros, écran toujours allumé.
export default function MagasinPage() {
  const router = useRouter();
  const { profile } = useSession();
  const { data: items = [], isPending } = useShoppingItems();
  const { toggle } = useShoppingActions();
  // Articles présents en entrant : tout autre article ajouté par l'autre est arrivé pendant les courses.
  const initialIds = useRef<Set<string> | null>(null);
  if (initialIds.current === null && !isPending) initialIds.current = new Set(items.map((i) => i.id));

  useWakeLock();

  useEffect(() => {
    document.documentElement.classList.add("store-mode");
    setStatusBar("ink");
    return () => {
      document.documentElement.classList.remove("store-mode");
      setStatusBar("y");
    };
  }, []);

  const left = items.filter((i) => !i.checked).length;
  const done = items.length - left;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;
  const exit = () => router.replace("/");

  return (
    <div className="store">
      <header className="stop">
        <div className="bar1">
          <button type="button" className="sx" onClick={exit} aria-label="Fermer le mode magasin">
            <Icon name="x" />
          </button>
          <h1 className="slabel">Mode magasin</h1>
          <span className="sleft" role="status">
            {left} {left > 1 ? "restants" : "restant"}
          </span>
        </div>
        <div className="prog" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement">
          <i style={{ width: `${progress}%` }} />
        </div>
      </header>

      {items.length === 0 && !isPending ? (
        <p className="sempty">La liste est vide.</p>
      ) : (
        <ul className="slist">
          {items.map((item) => {
            // Ajouté par l'autre pendant les courses : étiquette en direct.
            const live = item.addedBy !== profile && !!initialIds.current && !initialIds.current.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`sit${item.checked ? " done" : ""}`}
                  role="checkbox"
                  aria-checked={item.checked}
                  onClick={() => toggle.mutate({ id: item.id, checked: !item.checked })}
                >
                  <span className="box" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                  <span className="nm">
                    <span className="nmtxt">
                      {item.name}
                      <s className="strike" aria-hidden="true" />
                    </span>
                    {live && (
                      <>
                        <br />
                        <span className="live">Ajouté par {PROFILE_LABEL[item.addedBy]} à l’instant</span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="sexit" onClick={exit}>
        Quitter le mode magasin
      </button>
    </div>
  );
}
