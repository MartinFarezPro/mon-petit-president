"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: string; badge?: number | string };

/** Navigation de la ligue : 4 onglets de jeu (barre du bas sur mobile) + liens secondaires. */
export function LeagueTabs({ base, isAdmin, parisTodo, quizTodo, pronoTodo }: {
  base: string; isAdmin: boolean; parisTodo: number; quizTodo: number; pronoTodo: boolean;
}) {
  const path = usePathname();
  const main: Tab[] = [
    { href: base, label: "Classement", icon: "🏆" },
    { href: `${base}/prono`, label: "Prono", icon: "🗳️", badge: pronoTodo ? "!" : undefined },
    { href: `${base}/paris`, label: "Paris", icon: "🎯", badge: parisTodo || undefined },
    { href: `${base}/quiz`, label: "Quiz", icon: "🗣️", badge: quizTodo || undefined },
  ];
  const more: Tab[] = [
    { href: `${base}/sondages`, label: "Sondages", icon: "📊" },
    { href: `${base}/bareme`, label: "Barème", icon: "📖" },
    ...(isAdmin ? [{ href: `${base}/admin`, label: "Inviter & gérer", icon: "⚙️" }] : []),
  ];
  return (
    <>
      <nav className="mainnav" aria-label="Jeu">
        {main.map((t) => (
          <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
            <span className="mn-ic" aria-hidden="true">{t.icon}</span>
            <span className="mn-l">{t.label}</span>
            {t.badge ? <span className="tab-badge" aria-label="à faire">{t.badge}</span> : null}
          </Link>
        ))}
      </nav>
      <nav className="subnav" aria-label="Infos de la ligue">
        {more.map((t) => (
          <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
