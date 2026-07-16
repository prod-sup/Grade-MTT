import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireVisitor } from "@/lib/portal/dal";
import { convertTournament, formatMoney, ptWeekday, WEEKDAYS } from "@/lib/conversion";
import {
  formatBlinds,
  formatCompactNumber,
  formatLateReg,
  formatModality,
  formatStack,
} from "@/lib/flyer/format";
import { DayGrade, type PortalDay, type PortalRow } from "./_components/day-grade";

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

// Ordem de exibição por tipo (Main Event → Side Event → Sat), depois horário.
const TYPE_RANK: Record<string, number> = { "Main Event": 0, "Side Event": 1, "Sat": 2 };

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

  // Agrupa por DATA concreta (eventDate base GMT-3). O horário é convertido
  // para o fuso do visitante; o eventual "vazamento" de dia vira badge
  // (+1d/-1d). Cada linha já sai pronta para a tabela E para o flyer
  // (Roadmap V2, seção 2 — Cápsula de Dados).
  const rowsByDate = new Map<string, PortalRow[]>();
  for (const t of tournaments) {
    if (!t.eventDate) continue;
    const key = isoDayUTC(t.eventDate);
    const view = convertTournament(t, ctx, { includeAdminFee: true });
    const shortName = t.shortName ?? t.name; // MTT (público); cai p/ MTT MARKETING se vazio
    const row: PortalRow = {
      id: t.id,
      type: t.type,
      startTime: view.startTime,
      startDayOffset: view.startDayOffset,
      shortName,
      gtd: formatMoney(view.gtd, ctx.currencyLabel),
      buyIn: formatMoney(view.buyIn, ctx.currencyLabel),
      reentry: view.reentry != null ? formatMoney(view.reentry, ctx.currencyLabel) : "—",
      addon: view.addon != null ? formatMoney(view.addon, ctx.currencyLabel) : "—",
      blinds: formatBlinds(t.blindsEarly),
      lateReg: formatLateReg(t.lateRegLevels, view.lateRegTime),
      stack: formatStack(t.stackInicial),
      flyer: {
        id: t.id,
        dateLabel: formatDateUTC(t.eventDate),
        weekdayLabel: ptWeekday(view.dayOfWeek),
        name: shortName,
        modality: formatModality(t.koType, t.addon),
        gtdCompact: formatCompactNumber(view.gtd),
        buyIn: formatMoney(view.buyIn, ctx.currencyLabel),
        startTime: view.startTime,
        lateReg: formatLateReg(t.lateRegLevels, view.lateRegTime),
        blinds: formatBlinds(t.blindsEarly),
        stack: formatStack(t.stackInicial),
        currencyLabel: ctx.currencyLabel ?? "USD",
      },
    };
    const arr = rowsByDate.get(key) ?? [];
    arr.push(row);
    rowsByDate.set(key, arr);
  }
  for (const rows of rowsByDate.values()) {
    rows.sort((a, b) => {
      const ra = TYPE_RANK[a.type] ?? 99;
      const rb = TYPE_RANK[b.type] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.startTime.localeCompare(b.startTime);
    });
  }

  // 7 slots fixos (Segunda..Domingo) da semana exibida — o menu de dias do
  // portal navega entre eles em vez de listar todos verticalmente.
  const days: PortalDay[] = WEEKDAYS.map((w, i) => {
    const date = new Date(weekStart.getTime() + i * DAY_MS);
    return {
      en: w.en,
      dateLabel: formatDateUTC(date),
      weekdayLabel: w.pt,
      rows: rowsByDate.get(isoDayUTC(date)) ?? [],
    };
  });

  // Dia padrão: na semana atual, seleciona hoje; em outra semana, o primeiro
  // dia com torneios (senão Segunda).
  const nowOrder = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  const todayEn = WEEKDAYS.find((w) => w.order === nowOrder)?.en ?? "MONDAY";
  const defaultDayEn =
    weekStart.getTime() === currentWeekStart.getTime()
      ? todayEn
      : days.find((d) => d.rows.length > 0)?.en ?? "MONDAY";

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

      <DayGrade
        days={days}
        defaultDayEn={defaultDayEn}
        weekNav={{
          prevHref: `/portal?tab=${tab.key}&week=${isoDayUTC(prevWeek)}`,
          nextHref: `/portal?tab=${tab.key}&week=${isoDayUTC(nextWeek)}`,
          hasPrev,
          hasNext,
          label: weekLabel,
        }}
      />
    </div>
  );
}

