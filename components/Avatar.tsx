import type { Profile } from "@/lib/types";

export function Avatar({ p, size = 32 }: { p: Pick<Profile, "avatar" | "couleur" | "pseudo"> | undefined; size?: number }) {
  const bg = p?.couleur ?? "#5b6380";
  const content = p?.avatar || (p?.pseudo?.[0] ?? "?").toUpperCase();
  return (
    <span className="avatar" style={{ background: bg, width: size, height: size, fontSize: size * 0.5 }} aria-hidden="true">
      {content}
    </span>
  );
}
