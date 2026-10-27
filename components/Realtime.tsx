"use client";

import { useQueryClient } from "@tanstack/react-query";
import type * as AblyTypes from "ably";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { isProfile, type Profile } from "@/lib/domain/profile";
import { CHANNEL, type ChangeMessage } from "@/lib/realtime/types";

type Status = "connecting" | "connected" | "offline" | "disabled";

interface RealtimeState {
  status: Status;
  othersOnline: Profile[];
}

const RealtimeContext = createContext<RealtimeState>({ status: "connecting", othersOnline: [] });

export const useRealtime = () => useContext(RealtimeContext);

const POLL_MS = 15_000;

// Données à recharger selon ce qui a changé : le solde dépend des règlements, les budgets des dépenses.
const RELATED: Partial<Record<ChangeMessage["type"], string[]>> = {
  expenses: ["expenses", "budgets"],
  settlements: ["settlements", "expenses"],
  categories: ["categories", "expenses", "budgets"],
};

export function RealtimeProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("connecting");
  const [othersOnline, setOthersOnline] = useState<Profile[]>([]);
  const wasConnected = useRef(false);

  // Repli : sans temps réel, l'écran affiché se recharge toutes les 15 s tant que l'appli est au premier plan.
  useEffect(() => {
    const prev = queryClient.getDefaultOptions();
    queryClient.setDefaultOptions({
      ...prev,
      queries: {
        ...prev.queries,
        refetchInterval: status === "connected" ? false : POLL_MS,
        refetchIntervalInBackground: false,
      },
    });
  }, [status, queryClient]);

  useEffect(() => {
    let cancelled = false;
    let client: AblyTypes.Realtime | null = null;
    wasConnected.current = false;
    setStatus("connecting");
    setOthersOnline([]);

    (async () => {
      // Sonde : 503 si Ably n'est pas encore configuré côté serveur.
      try {
        await api("/realtime/token");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 503) {
          setStatus("disabled");
          return;
        }
        setStatus("offline");
      }
      if (cancelled) return;

      const Ably = await import("ably");
      if (cancelled) return;
      client = new Ably.Realtime({
        authCallback: (_params, callback) => {
          api<AblyTypes.TokenRequest>("/realtime/token")
            .then((tr) => callback(null, tr))
            .catch((e: unknown) => callback(String(e), null));
        },
        closeOnUnload: true,
      });

      client.connection.on((change) => {
        if (cancelled) return;
        if (change.current === "connected") {
          // Reconnexion (sortie de veille, réseau revenu) : on recharge ce qui est affiché.
          if (wasConnected.current) queryClient.invalidateQueries();
          wasConnected.current = true;
          setStatus("connected");
        } else if (["disconnected", "suspended", "failed", "closed"].includes(change.current)) {
          setStatus("offline");
        }
      });
      if (client.connection.state === "connected") {
        wasConnected.current = true;
        setStatus("connected");
      }

      const channel = client.channels.get(CHANNEL);
      await channel.subscribe("change", (msg) => {
        const data = msg.data as ChangeMessage | undefined;
        if (!data?.type) return;
        for (const key of RELATED[data.type] ?? [data.type]) queryClient.invalidateQueries({ queryKey: [key] });
      });

      const syncPresence = async () => {
        const members = await channel.presence.get();
        if (cancelled) return;
        const others = new Set<Profile>();
        for (const m of members) if (m.clientId !== profile && isProfile(m.clientId)) others.add(m.clientId);
        setOthersOnline([...others]);
      };
      await channel.presence.subscribe(() => {
        syncPresence().catch(() => {});
      });
      await channel.presence.enter({ profile });
      await syncPresence();
    })().catch(() => {
      if (!cancelled) setStatus("offline");
    });

    return () => {
      cancelled = true;
      client?.close();
    };
  }, [profile, queryClient]);

  return <RealtimeContext.Provider value={{ status, othersOnline }}>{children}</RealtimeContext.Provider>;
}
