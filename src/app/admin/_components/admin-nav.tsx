"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Painel", exact: true, roles: ["ADMIN", "OPERACIONAL", "MARKETING"] },
  { href: "/admin/grade", label: "Grade de Torneios", roles: ["ADMIN", "OPERACIONAL", "MARKETING"] },
  { href: "/admin/series", label: "Upload de Séries", roles: ["ADMIN"] },
  { href: "/admin/handicaps", label: "Handicaps", roles: ["ADMIN", "OPERACIONAL", "MARKETING"] },
  { href: "/admin/users", label: "Check-ins (Portal)", roles: ["ADMIN", "OPERACIONAL", "MARKETING"] },
  { href: "/admin/marketing", label: "Marketing", roles: ["ADMIN", "MARKETING"] },
] as const;

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => (item.roles as readonly string[]).includes(role));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors " +
              (active
                ? "border-[#d4af37] bg-white/[0.06] text-white"
                : "border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-gray-200")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
