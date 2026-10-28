import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Règles propres à Casa, avant celles par défaut (section 10.7).
const casaCache: RuntimeCaching[] = [
  {
    // Courses, accès et temps réel : jamais de réponse en cache. La liste vit dans le cache du
    // téléphone et les écritures hors ligne passent par la file d'attente.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && (url.pathname.startsWith("/api/shopping") || url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/realtime")),
    handler: new NetworkOnly(),
  },
  {
    // Autres modules : hors ligne, on affiche les dernières données connues.
    matcher: ({ url, sameOrigin, request }) => sameOrigin && request.method === "GET" && url.pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkFirst({
      cacheName: "casa-api",
      networkTimeoutSeconds: 6,
      plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 86400 })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...casaCache, ...defaultCache],
});

serwist.addEventListeners();
