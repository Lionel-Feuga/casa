"use client";

import { useState } from "react";
import { applyTheme, currentTheme } from "@/lib/client/theme";
import { THEMES } from "@/lib/themes";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

export function ThemeSheet({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(currentTheme);
  return (
    <Sheet title="Thème" onClose={onClose}>
      <h3>Thème</h3>
      <p className="note">Seulement sur ce téléphone.</p>
      <div className="tgrid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tile"
            aria-pressed={active === t.id}
            onClick={() => {
              applyTheme(t.id);
              setActive(t.id);
            }}
          >
            <span className="mini" style={{ background: t.y }}>
              <b />
              <i style={{ background: t.pk }} />
            </span>
            {t.name}
            {active === t.id && (
              <span className="tick">
                <Icon name="check" />
              </span>
            )}
          </button>
        ))}
      </div>
      <button type="button" className="btn" onClick={onClose}>
        Fermer
      </button>
    </Sheet>
  );
}
