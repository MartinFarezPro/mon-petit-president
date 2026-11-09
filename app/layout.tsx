import type { Metadata, Viewport } from "next";
// Polices auto-hébergées (pas d'appel à Google Fonts au build ni chez le joueur)
import "@fontsource/bricolage-grotesque/latin-500.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/public-sans/latin-400.css";
import "@fontsource/public-sans/latin-500.css";
import "@fontsource/public-sans/latin-600.css";
import "@fontsource/public-sans/latin-700.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mon Petit Président", template: "%s · Mon Petit Président" },
  description: "Le jeu de pronostics entre potes pour la présidentielle 2027.",
  applicationName: "Mon Petit Président",
  appleWebApp: { capable: true, title: "Petit Président", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1122" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
