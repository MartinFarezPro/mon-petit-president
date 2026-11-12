"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

/** Gros appel à déposer son prono, sur toutes les pages de la ligue sauf celle du prono. */
export function PronoCta({ href }: { href: string }) {
  const path = usePathname();
  if (path === href) return null;
  return (
    <section className="prono-cta">
      <div className="pc-urne"><Icon name="urne" /></div>
      <div className="pc-txt">
        <b>Ton prono n&apos;est pas encore dans l&apos;urne</b>
        <span>Classe les candidats, devine le vainqueur et les scores : 400 pts en jeu, le plus gros morceau de la saison.</span>
      </div>
      <Link href={href} className="pc-btn">Déposer mon prono →</Link>
    </section>
  );
}
