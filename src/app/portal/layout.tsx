import { prisma } from "@/lib/prisma";
import { requireVisitor } from "@/lib/portal/dal";
import { buildContextOptions, fusoValue } from "@/lib/portal/context-options";
import { ContextSelector } from "./context-selector";
import { exitPortal } from "./actions";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Grade MTT — Suprema
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Olá, {visitor.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ContextSelector
              handicaps={handicaps}
              fusos={fusos}
              currentHandicapId={visitor.handicapId}
              currentFuso={currentFuso}
            />
            <form action={exitPortal}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
