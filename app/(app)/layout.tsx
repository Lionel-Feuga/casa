"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/Providers";
import { OfflineSync } from "@/components/OfflineSync";
import { RealtimeProvider } from "@/components/Realtime";
import { TabBar } from "@/components/TabBar";

// Écrans principaux : sans jeton, écran du code ; sans profil, « C'est qui ? ».
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, hasToken, profile } = useSession();
  const router = useRouter();
  // Mode magasin et formulaires : sans barre d'onglets ni décor.
  const path = usePathname();
  const fullScreen = ["/magasin", "/comptes/nouvelle", "/a-payer/facture"].includes(path);

  useEffect(() => {
    if (!ready) return;
    if (!hasToken) router.replace("/code");
    else if (!profile) router.replace("/profil");
  }, [ready, hasToken, profile, router]);

  if (!ready || !hasToken || !profile) return <div className="boot" />;

  return (
    <RealtimeProvider profile={profile}>
      <OfflineSync />
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
