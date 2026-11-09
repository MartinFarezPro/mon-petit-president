"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LeagueTabs({ base, isAdmin, openCount }: { base: string; isAdmin: boolean; openCount: number }) {
  const path = usePathname();
  const tabs = [
    { href: base, label: "Classement" },
    { href: `${base}/prono`, label: "Mon prono" },
    { href: `${base}/journees`, label: openCount ? `Journées · ${openCount}` : "Journées" },
    { href: `${base}/sondages`, label: "Sondages" },
    { href: `${base}/bareme`, label: "Barème" },
    ...(isAdmin ? [{ href: `${base}/admin`, label: "Admin" }] : []),
  ];
  return (
    <nav className="tabs" aria-label="Sections de la ligue">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
