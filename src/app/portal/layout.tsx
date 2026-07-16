import { prisma } from "@/lib/prisma";
import { requireVisitor } from "@/lib/portal/dal";
import { buildContextOptions, fusoValue } from "@/lib/portal/context-options";
import { GOLD_GRADIENT_TEXT } from "@/lib/ui/premium";
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
    <div className="premium-atmosphere min-h-screen bg-[#0b0c0e] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0b0c0e]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
              Suprema Poker
            </p>
            <p className={`text-sm font-bold ${GOLD_GRADIENT_TEXT}`}>Grade MTT</p>
            <p className="text-xs text-gray-500">Olá, {visitor.name}</p>
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
                className="rounded-xl border border-white/[0.1] px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:border-white/[0.2] hover:text-white"
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
