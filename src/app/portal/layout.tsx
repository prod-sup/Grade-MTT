import { prisma } from "@/lib/prisma";
import { requireVisitor } from "@/lib/portal/dal";
import { buildContextOptions, fusoValue } from "@/lib/portal/context-options";
import {
  GOLD_GRADIENT_TEXT,
  SURFACE_BG,
  TEXT_PRIMARY,
  TEXT_MUTED,
  TEXT_SECONDARY,
  BORDER_SUBTLE,
} from "@/lib/ui/premium";
import { ContextSelector } from "./context-selector";
import { exitPortal } from "./actions";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const visitor = await requireVisitor();

  const rows = await prisma.handicap.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
  });
  const { handicaps, fusos } = buildContextOptions(rows);
  const currentFuso = fusoValue(visitor.utcOffset, visitor.timezoneLabel);

  return (
    <div className={`premium-atmosphere min-h-screen ${SURFACE_BG} ${TEXT_PRIMARY}`}>
      <header
        className={`sticky top-0 z-40 border-b ${BORDER_SUBTLE} bg-white/85 dark:bg-[#0b0c0e]/85 backdrop-blur-md`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${TEXT_MUTED}`}>
              Suprema Poker
            </p>
            <p className={`text-sm font-bold ${GOLD_GRADIENT_TEXT}`}>Grade MTT</p>
            <p className={`text-xs ${TEXT_MUTED}`}>Olá, {visitor.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <ContextSelector
              handicaps={handicaps}
              fusos={fusos}
              currentHandicapId={visitor.handicapId}
              currentFuso={currentFuso}
            />
            <ThemeToggle />
            <form action={exitPortal}>
              <button
                type="submit"
                className={`rounded-xl border border-gray-200 dark:border-white/[0.1] px-3 py-1.5 text-sm font-medium transition-colors hover:border-gray-300 dark:hover:border-white/[0.2] hover:text-gray-900 dark:hover:text-white ${TEXT_SECONDARY}`}
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
