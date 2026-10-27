import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Casa",
    short_name: "Casa",
    description: "L'appli de l'appart de Lionel et Jaz",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Blanc comme la barre d'onglets : Android fige ces couleurs à l'installation (barre du bas, écran de lancement),
    // elles ne peuvent pas suivre le thème. La barre du haut suit le thème via <meta name="theme-color">.
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
