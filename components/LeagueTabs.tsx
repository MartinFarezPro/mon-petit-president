"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LeagueTabs({ base, isAdmin, parisTodo, quizTodo }: { base: string; isAdmin: boolean; parisTodo: number; quizTodo: number }) {
  const path = usePathname();
  const tabs: { href: string; label: string; badge?: number }[] = [
    { href: base, label: "Classement" },
    { href: `${base}/prono`, label: "Mon prono" },
    { href: `${base}/paris`, label: "Paris", badge: parisTodo },
    { href: `${base}/quiz`, label: "Quiz", badge: quizTodo },
    { href: `${base}/sondages`, label: "Sondages" },
    { href: `${base}/bareme`, label: "Barème" },
    ...(isAdmin ? [{ href: `${base}/admin`, label: "Admin" }] : []),
  ];
  return (
    <nav className="tabs" aria-label="Sections de la ligue">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
          {t.label}
          {t.badge ? <span className="tab-badge" aria-label={`${t.badge} à faire`}>{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
