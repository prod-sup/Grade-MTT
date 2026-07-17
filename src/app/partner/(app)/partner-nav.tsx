"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GOLD_GRADIENT_BG, TEXT_SECONDARY } from "@/lib/ui/premium";

const ITEMS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/partner", label: "Painel", exact: true },
  { href: "/partner/brand", label: "Minha Marca" },
  { href: "/partner/flyer", label: "Gerar Flyer" },
];

export function PartnerNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 " +
              (active
                ? `${GOLD_GRADIENT_BG} text-black font-semibold`
                : `${TEXT_SECONDARY} hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white`)
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
