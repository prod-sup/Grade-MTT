"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Alternador Light/Dark (ícone sol/lua). `next-themes` só resolve o tema
 * real no cliente (evita mismatch de hidratação) — por isso o ícone só
 * renderiza depois do mount; até lá, um espaço reservado do mesmo tamanho.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className={`inline-block h-9 w-9 ${className}`} aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className={
        "flex h-9 w-9 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-50 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06] " +
        className
      }
    >
      {isDark ? (
        // Sol — aparece quando o tema atual é escuro (clique pra ir pro claro).
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        // Lua — aparece quando o tema atual é claro (clique pra ir pro escuro).
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}
