"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

type Tab = { href: string; label: string; icon: IconName; badge?: number | string };

/** Navigation de la ligue : 4 onglets de jeu (barre du bas sur mobile) + liens secondaires. */
export function LeagueTabs({ base, isAdmin, parisTodo, quizTodo, pronoTodo }: {
  base: string; isAdmin: boolean; parisTodo: number; quizTodo: number; pronoTodo: boolean;
}) {
  const path = usePathname();
  const main: Tab[] = [
    { href: base, label: "Classement", icon: "podium" },
    { href: `${base}/prono`, label: "Prono", icon: "urne", badge: pronoTodo ? "!" : undefined },
    { href: `${base}/paris`, label: "Paris", icon: "cible", badge: parisTodo || undefined },
    { href: `${base}/quiz`, label: "Quiz", icon: "bulle", badge: quizTodo || undefined },
  ];
  const more: Tab[] = [
    { href: `${base}/sondages`, label: "Sondages", icon: "courbe" },
    { href: `${base}/bareme`, label: "Barème", icon: "livre" },
    ...(isAdmin ? [{ href: `${base}/admin`, label: "Inviter & gérer", icon: "reglages" as const }] : []),
  ];
  return (
    <>
      <nav className="mainnav" aria-label="Jeu">
        {main.map((t) => (
          <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
            <span className="mn-ic"><Icon name={t.icon} /></span>
            <span className="mn-l">{t.label}</span>
            {t.badge ? <span className="tab-badge" aria-label="à faire">{t.badge}</span> : null}
          </Link>
        ))}
      </nav>
      <nav className="subnav" aria-label="Infos de la ligue">
        {more.map((t) => (
          <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
            <Icon name={t.icon} /> {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
