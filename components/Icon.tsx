/** Icônes au trait (24 × 24), couleur héritée du texte. */
const PATHS = {
  podium: "M8 21V11h8v10M2 21v-6h6M16 21v-8h6v8M1 21h22M12 3l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 9l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z",
  urne: "M4 11h16v10H4zM8 11V4h8v7M10 7h4M9 15h6",
  cible: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01M21 3l-9 9M17 3h4v4",
  bulle: "M4 4h16v12H9l-5 4zM8 9h1.5v2.5L8 13M13 9h1.5v2.5L13 13",
  courbe: "M3 3v18h18M7 15l4-5 3 3 5-7",
  livre: "M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-1 .2M20 4v14h-7",
  reglages: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  cadenas: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
