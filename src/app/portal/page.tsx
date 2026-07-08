import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireVisitor } from "@/lib/portal/dal";
import { convertTournament, formatMoney, ptWeekday } from "@/lib/conversion";

// --- Definição das 5 abas (seção 6) ---
type TabKey = "grade" | "satellites" | "featured" | "series" | "live";

const TABS: { key: TabKey; label: string; where: Prisma.TournamentWhereInput }[] = [
  { key: "grade", label: "Grade Torneios", where: { category: "GRADE" } },
  { key: "satellites", label: "Grade Satélites", where: { category: "SATELLITE" } },
  { key: "featured", label: "Eventos em Destaque", where: { featured: true } },
  { key: "series", label: "Séries", where: { category: "SERIES" } },
  { key: "live", label: "Cronograma Satélites Live", where: { category: "LIVE_SATELLITE" } },
];

// ---------------------------------------------------------------------------
// Helpers de semana (tudo em UTC — eventDate é gravado à meia-noite UTC do dia)
// ---------------------------------------------------------------------------
const DAY_MS = 86_400_000;

/** Segunda-feira 00:00 UTC da semana que contém `d`. */
function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay(); // 0=Domingo..6=Sábado
  const diff = day === 0 ? 6 : day - 1; // dias desde segunda
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff),
  );
}

/** "YYYY-MM-DD" (UTC) → Date à meia-noite UTC; null se inválido. */
function parseISODateUTC(value: string | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isoDayUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "Quarta-feira - 08/07/2026" a partir de uma data UTC. */
function formatDateUTC(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; series?: string; week?: string }>;
}) {
  const visitor = await requireVisitor();
  const { tab: tabParam, series, week: weekParam } = await searchParams;

  const tab = TABS.find((t) => t.key === tabParam) ?? TABS[0];

  const handicap = await prisma.handicap.findUnique({
    where: { id: visitor.handicapId },
  });

  const ctx = {
    multiplier: handicap?.multiplier ?? 1,
    utcOffset: visitor.utcOffset,
    currencyLabel: handicap?.currencyLabel ?? "USD",
  };

  // --- Limites de navegação por semana ---------------------------------------
  // O site exibe do mês atual até dezembro: escondemos meses arquivados e
  // semanas passadas. O limite inferior é a semana atual; o superior, a semana
  // do último torneio não-arquivado disponível.
  const now = new Date();
  const currentWeekStart = startOfWeekUTC(now);

  const lastEvent = await prisma.tournament.findFirst({
    where: { visible: true, archived: false, eventDate: { not: null } },
    orderBy: { eventDate: "desc" },
    select: { eventDate: true },
  });
  const maxWeekStart = lastEvent?.eventDate
    ? startOfWeekUTC(lastEvent.eventDate)
    : currentWeekStart;

  const requested = parseISODateUTC(weekParam);
  let weekStart = requested ? startOfWeekUTC(requested) : currentWeekStart;
  if (weekStart.getTime() < currentWeekStart.getTime()) weekStart = currentWeekStart;
  if (weekStart.getTime() > maxWeekStart.getTime()) weekStart = maxWeekStart;
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS); // exclusivo

  const prevWeek = new Date(weekStart.getTime() - 7 * DAY_MS);
  const nextWeek = weekEnd;
  const hasPrev = prevWeek.getTime() >= currentWeekStart.getTime();
  const hasNext = nextWeek.getTime() <= maxWeekStart.getTime();

  // --- Consulta da semana selecionada ----------------------------------------
  const where: Prisma.TournamentWhereInput = {
    visible: true,
    archived: false,
    eventDate: { gte: weekStart, lt: weekEnd },
    ...tab.where,
    ...(tab.key === "series" && series ? { seriesName: series } : {}),
  };

  const tournaments = await prisma.tournament.findMany({
    where,
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });

  // Séries disponíveis (para o subseletor) — dentro do intervalo visível.
  const seriesNames =
    tab.key === "series"
      ? (
          await prisma.tournament.findMany({
            where: {
              visible: true,
              archived: false,
              category: "SERIES",
              seriesName: { not: null },
            },
            select: { seriesName: true },
            distinct: ["seriesName"],
            orderBy: { seriesName: "asc" },
          })
        ).map((r) => r.seriesName!)
      : [];

  // Agrupa por DATA concreta (eventDate base GMT-3). O horário é convertido para
  // o fuso do visitante; o eventual "vazamento" de dia vira badge (+1d/-1d).
  type RowView = {
    time: string;
    view: ReturnType<typeof convertTournament>;
    shortName: string;
    type: string;
    blindsEarly: number | null;
    lateRegLevels: number | null;
  };
  const groups = new Map<string, { date: Date; rows: RowView[] }>();
  for (const t of tournaments) {
    if (!t.eventDate) continue;
    const key = isoDayUTC(t.eventDate);
    const view = convertTournament(t, ctx, { includeAdminFee: true });
    const group = groups.get(key) ?? { date: t.eventDate, rows: [] };
    group.rows.push({
      time: view.startTime,
      view,
      shortName: t.shortName ?? t.name, // MTT (público); cai p/ MTT MARKETING se vazio
      type: t.type,
      blindsEarly: t.blindsEarly,
      lateRegLevels: t.lateRegLevels,
    });
    groups.set(key, group);
  }

  const orderedDays = [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  for (const [, g] of orderedDays) g.rows.sort((a, b) => a.time.localeCompare(b.time));

  const weekLabel = `${formatDateUTC(weekStart)} – ${formatDateUTC(
    new Date(weekEnd.getTime() - DAY_MS),
  )}`;

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

      {/* Navegação por semana */}
      <div className="flex items-center justify-between gap-2">
        <WeekNavButton
          href={`/portal?tab=${tab.key}&week=${isoDayUTC(prevWeek)}`}
          enabled={hasPrev}
          label="‹ Semana anterior"
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {weekLabel}
        </span>
        <WeekNavButton
          href={`/portal?tab=${tab.key}&week=${isoDayUTC(nextWeek)}`}
          enabled={hasNext}
          label="Próxima semana ›"
        />
      </div>

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
          Nenhum torneio disponível nesta semana.
        </p>
      ) : (
        orderedDays.map(([key, g]) => (
          <section key={key}>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {ptWeekday(g.rows[0]?.view.dayOfWeek ?? "")}{" "}
              <span className="text-sm font-normal text-zinc-500">
                {formatDateUTC(g.date)}
              </span>
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
                  {g.rows.map((r, i) => (
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
                        {r.shortName}
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

function WeekNavButton({
  href,
  enabled,
  label,
}: {
  href: string;
  enabled: boolean;
  label: string;
}) {
  const cls =
    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";
  if (!enabled) {
    return (
      <span
        className={`${cls} cursor-not-allowed border-zinc-200 text-zinc-300 dark:border-zinc-800 dark:text-zinc-700`}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${cls} border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800`}
    >
      {label}
    </Link>
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
