"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Painel", exact: true },
  { href: "/admin/grade", label: "Grade de Torneios" },
  { href: "/admin/series", label: "Upload de Séries" },
  { href: "/admin/handicaps", label: "Handicaps" },
  { href: "/admin/users", label: "Check-ins (Portal)" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "rounded-md px-3 py-2 text-sm font-medium transition-colors " +
              (active
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
