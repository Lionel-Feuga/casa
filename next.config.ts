import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Les écrans sont mis en cache à l'installation, pour que l'appli s'ouvre même sans réseau (section 10.7).
const revision = String(Date.now());
const screens = ["/", "/magasin", "/comptes", "/comptes/nouvelle", "/budgets", "/a-faire", "/a-payer", "/a-payer/facture", "/code", "/profil"];

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Pas de rechargement de la page au retour du réseau : la file d'attente et le temps réel s'en chargent.
  reloadOnOnline: false,
  additionalPrecacheEntries: screens.map((url) => ({ url, revision })),
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
