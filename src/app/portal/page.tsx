import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireVisitor } from "@/lib/portal/dal";
import {
  convertTournament,
  formatMoney,
  ptWeekday,
  WEEKDAYS,
} from "@/lib/conversion";

// --- Definição das 5 abas (seção 6) ---
type TabKey = "grade" | "satellites" | "featured" | "series" | "live";

const TABS: { key: TabKey; label: string; where: Prisma.TournamentWhereInput }[] = [
  { key: "grade", label: "Grade Torneios", where: { category: "GRADE" } },
  { key: "satellites", label: "Grade Satélites", where: { category: "SATELLITE" } },
  { key: "featured", label: "Eventos em Destaque", where: { featured: true } },
  { key: "series", label: "Séries", where: { category: "SERIES" } },
  { key: "live", label: "Cronograma Satélites Live", where: { category: "LIVE_SATELLITE" } },
];

const ORDER_BY_EN = new Map(WEEKDAYS.map((w) => [w.en, w.order]));

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; series?: string }>;
}) {
  const visitor = await requireVisitor();
  const { tab: tabParam, series } = await searchParams;

  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];

  const handicap = await prisma.handicap.findUnique({
    where: { id: visitor.handicapId },
  });

  // Contexto de conversão: moeda do handicap, horário do fuso escolhido.
  const ctx = {
    multiplier: handicap?.multiplier ?? 1,
    utcOffset: visitor.utcOffset,
    currencyLabel: handicap?.currencyLabel ?? "USD",
  };

  // Filtro extra da aba Séries (uma série específica).
  const where: Prisma.TournamentWhereInput = {
    visible: true,
    ...tab.where,
    ...(tab.key === "series" && series ? { seriesName: series } : {}),
  };

  const tournaments = await prisma.tournament.findMany({
    where,
    orderBy: [{ dayOrder: "asc" }, { startTime: "asc" }],
  });

  // Séries disponíveis (para o subseletor).
  const seriesNames =
    tab.key === "series"
      ? (
          await prisma.tournament.findMany({
            where: { visible: true, category: "SERIES", seriesName: { not: null } },
            select: { seriesName: true },
            distinct: ["seriesName"],
            orderBy: { seriesName: "asc" },
          })
        ).map((r) => r.seriesName!)
      : [];

  // Converte e agrupa por dia (já com eventual deslocamento de fuso aplicado).
  const groups = new Map<string, { time: string; view: ReturnType<typeof convertTournament>; name: string; type: string; blindsEarly: number | null; lateRegLevels: number | null }[]>();
  for (const t of tournaments) {
    const view = convertTournament(t, ctx, { includeAdminFee: true });
    const arr = groups.get(view.dayOfWeek) ?? [];
    arr.push({
      time: view.startTime,
      view,
      name: t.name,
      type: t.type,
      blindsEarly: t.blindsEarly,
      lateRegLevels: t.lateRegLevels,
    });
    groups.set(view.dayOfWeek, arr);
  }

  const orderedDays = [...groups.entries()].sort(
    (a, b) => (ORDER_BY_EN.get(a[0]) ?? 99) - (ORDER_BY_EN.get(b[0]) ?? 99),
  );
  for (const [, rows] of orderedDays) rows.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="flex flex-col gap-5">
      {/* Abas */}
      <nav className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => {
          const active = t.key === tab.key;
          return (
            <Link
              key={t.key}
              href={`/portal?tab=${t.key}`}
              className={
                "rounded-t-md px-3 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Subseletor de séries */}
      {tab.key === "series" && seriesNames.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {seriesNames.map((s) => (
            <Link
              key={s}
              href={`/portal?tab=series&series=${encodeURIComponent(s)}`}
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (series === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
              }
            >
              {s}
            </Link>
          ))}
        </div>
      ) : null}

      {orderedDays.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Nenhum torneio disponível nesta aba.
        </p>
      ) : (
        orderedDays.map(([dayEn, rows]) => (
          <section key={dayEn}>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {ptWeekday(dayEn)}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
                  <tr>
                    <Th>Horário</Th>
                    <Th>Torneio</Th>
                    <Th>GTD</Th>
                    <Th>Buy-in</Th>
                    <Th>Reentry</Th>
                    <Th>Add-on</Th>
                    <Th>Blinds</Th>
                    <Th>Late Reg</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                      <Td className="whitespace-nowrap font-medium">
                        {r.view.startTime}
                        {r.view.startDayOffset !== 0 ? (
                          <span className="ml-1 text-xs text-amber-600">
                            {r.view.startDayOffset > 0 ? "+1d" : "-1d"}
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        {r.name}
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {r.type}
                        </span>
                      </Td>
                      <Td>{formatMoney(r.view.gtd, ctx.currencyLabel)}</Td>
                      <Td>{formatMoney(r.view.buyIn, ctx.currencyLabel)}</Td>
                      <Td>{r.view.reentry != null ? formatMoney(r.view.reentry, ctx.currencyLabel) : "—"}</Td>
                      <Td>{r.view.addon != null ? formatMoney(r.view.addon, ctx.currencyLabel) : "—"}</Td>
                      <Td className="whitespace-nowrap">{r.blindsEarly != null ? `${r.blindsEarly} min` : "—"}</Td>
                      <Td className="whitespace-nowrap">
                        {r.lateRegLevels != null ? `${r.lateRegLevels} níveis` : "—"}
                        {r.view.lateRegTime ? ` · ${r.view.lateRegTime}` : ""}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-zinc-800 dark:text-zinc-200 ${className}`}>{children}</td>;
}
