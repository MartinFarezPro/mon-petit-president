import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mon Petit Président",
    short_name: "Petit Président",
    description: "Le jeu de pronostics entre potes pour la présidentielle 2027.",
    start_url: "/ligues",
    scope: "/",
    display: "standalone",
    background_color: "#eef1f7",
    theme_color: "#1f3fbf",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
