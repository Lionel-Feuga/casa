"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/Providers";
import { RealtimeProvider } from "@/components/Realtime";
import { TabBar } from "@/components/TabBar";

// Écrans principaux : sans jeton, écran du code ; sans profil, « C'est qui ? ».
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, hasToken, profile } = useSession();
  const router = useRouter();
  const fullScreen = usePathname() === "/magasin"; // mode magasin : sans barre d'onglets ni décor

  useEffect(() => {
    if (!ready) return;
    if (!hasToken) router.replace("/code");
    else if (!profile) router.replace("/profil");
  }, [ready, hasToken, profile, router]);

  if (!ready || !hasToken || !profile) return <div className="boot" />;

  return (
    <RealtimeProvider profile={profile}>
      {fullScreen ? (
        children
      ) : (
        <>
          <div className="app">
            <div className="deco" aria-hidden="true" />
            {children}
          </div>
          <TabBar />
        </>
      )}
    </RealtimeProvider>
  );
}
