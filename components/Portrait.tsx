"use client";

import { useState } from "react";
import type { Candidate } from "@/lib/types";

/** Portrait rond d'un candidat ; initiales sur sa couleur si pas de photo ou si l'image ne charge pas. */
export function Portrait({ c, size = 40 }: { c: Pick<Candidate, "nom" | "couleur" | "photo">; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = c.nom
    .split(/[\s-]+/)
    .filter((w) => w && w[0] === w[0].toUpperCase())
    .map((w) => w[0])
    .slice(-2)
    .join("");
  const style = { width: size, height: size, borderColor: c.couleur, fontSize: size * 0.36 };
  if (!c.photo || broken) {
    return (
      <span className="portrait" style={{ ...style, background: c.couleur }} aria-hidden="true">
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="portrait" src={c.photo} alt={c.nom} width={size} height={size} style={style}
      loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
  );
}
