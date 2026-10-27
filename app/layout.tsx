import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Figtree } from "next/font/google";
import { DEFAULT_THEME, THEMES, themeBootScript } from "@/lib/themes";
import { Providers } from "@/components/Providers";
import "./globals.css";

const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-bagel", display: "swap" });
const figtree = Figtree({ weight: ["600", "700", "800"], subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "Casa",
  description: "L'appli de l'appart de Lionel et Jaz",
  applicationName: "Casa",
  appleWebApp: { capable: true, title: "Casa", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEMES.find((t) => t.id === DEFAULT_THEME)!.y,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme={DEFAULT_THEME} className={`${bagel.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
