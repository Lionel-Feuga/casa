"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Courses", icon: "basket" },
  { href: "/comptes", label: "Comptes", icon: "coins" },
  { href: "/budgets", label: "Budgets", icon: "pie" },
  { href: "/a-faire", label: "À faire", icon: "todo" },
  { href: "/a-payer", label: "À payer", icon: "cal" },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Onglets">
      {TABS.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab${on ? " on" : ""}`} aria-current={on ? "page" : undefined}>
            <Icon name={t.icon} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
