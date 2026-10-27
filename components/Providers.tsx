"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Profile } from "@/lib/domain/profile";
import { getStoredProfile, getToken, setStoredProfile } from "@/lib/client/api";

interface Session {
  ready: boolean;
  hasToken: boolean;
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  refresh: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession hors de Providers");
  return s;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: true, retry: 1 } },
      }),
  );
  const [state, setState] = useState({ ready: false, hasToken: false, profile: null as Profile | null });

  const refresh = useCallback(() => {
    setState({ ready: true, hasToken: !!getToken(), profile: getStoredProfile() });
  }, []);

  useEffect(() => {
    refresh();
    // Un autre onglet a changé le code ou le profil
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const setProfile = useCallback(
    (p: Profile | null) => {
      setStoredProfile(p);
      refresh();
    },
    [refresh],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={{ ...state, setProfile, refresh }}>{children}</SessionContext.Provider>
    </QueryClientProvider>
  );
}
