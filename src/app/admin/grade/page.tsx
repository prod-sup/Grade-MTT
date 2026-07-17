import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isAdmin } from "@/lib/auth/dal";
import { GradeTable, type TournamentRow } from "./grade-table";
import { setMonthArchived } from "./actions";
import {
  TEXT_PRIMARY,
  TEXT_BODY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_SUBTLE,
  BORDER_HAIRLINE,
} from "@/lib/ui/premium";

const MONTH_PT = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function ymLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_PT[Number(m)]}/${y}`;
}

// ---------------------------------------------------------------------------
// Helpers de semana (UTC — eventDate é gravado à meia-noite UTC do dia).
// Cada torneio é ÚNICO (não é template): a edição é por data. Escopamos por
// semana para que cada dia mostre suas linhas daquela data. Meses futuros vazios
// são construídos dia a dia (copyDay) ou por semana (copyWeek).
// ---------------------------------------------------------------------------
const DAY_MS = 86_400_000;
const WEEKDAY_EN = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
}
function parseISODateUTC(v: string | undefined): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}
function isoDayUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function formatDateUTC(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

export default async function GradePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; day?: string }>;
}) {
  const user = await requireUser();
  const canEdit = isAdmin(user);
  const { week: weekParam, day: dayParam } = await searchParams;

  const [first, last] = await Promise.all([
    prisma.tournament.findFirst({
      where: { eventDate: { not: null } },
      orderBy: { eventDate: "asc" },
      select: { eventDate: true },
    }),
    prisma.tournament.findFirst({
      where: { eventDate: { not: null } },
      orderBy: { eventDate: "desc" },
      select: { eventDate: true },
    }),
  ]);

  const now = new Date();
  const minWeek = first?.eventDate ? startOfWeekUTC(first.eventDate) : startOfWeekUTC(now);

  // Permite navegar/CONSTRUIR até o fim do mês seguinte ao último com dados.
  const lastData = last?.eventDate ?? now;
  const nextMonthFirst = new Date(Date.UTC(lastData.getUTCFullYear(), lastData.getUTCMonth() + 1, 1));
  const nextMonthLast = new Date(Date.UTC(nextMonthFirst.getUTCFullYear(), nextMonthFirst.getUTCMonth() + 1, 0));
  const navMaxWeek = startOfWeekUTC(nextMonthLast);

  const requested = parseISODateUTC(weekParam);
  let weekStart = requested ? startOfWeekUTC(requested) : startOfWeekUTC(now);
  if (weekStart.getTime() < minWeek.getTime()) weekStart = minWeek;
  if (weekStart.getTime() > navMaxWeek.getTime()) weekStart = navMaxWeek;
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);

  const prevWeek = new Date(weekStart.getTime() - 7 * DAY_MS);
  const nextWeek = weekEnd;
  const hasPrev = prevWeek.getTime() >= minWeek.getTime();
  const hasNext = nextWeek.getTime() <= navMaxWeek.getTime();

  const rows = await prisma.tournament.findMany({
    where: { eventDate: { gte: weekStart, lt: weekEnd } },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });

  const tournaments: TournamentRow[] = rows.map((t) => {
    const rest: Record<string, unknown> = { ...t };
    delete rest.createdAt;
    delete rest.updatedAt;
    delete rest.eventDate;
    return rest as TournamentRow;
  });

  // Para cada dia da semana exibida: existe torneio? e qual a data-fonte
  // (ocorrência anterior mais recente do mesmo dia da semana com dados)?
  const filledByDay: Record<string, boolean> = {};
  for (const t of tournaments) filledByDay[t.dayOfWeek] = true;

  const sourceByDay: Record<string, string | null> = {};
  if (canEdit) {
    await Promise.all(
      WEEKDAY_EN.map(async (dayEn, i) => {
        if (filledByDay[dayEn]) {
          sourceByDay[dayEn] = null;
          return;
        }
        const target = new Date(weekStart.getTime() + i * DAY_MS);
        const src = await prisma.tournament.findFirst({
          where: { dayOfWeek: dayEn, eventDate: { lt: target } },
          orderBy: { eventDate: "desc" },
          select: { eventDate: true },
        });
        sourceByDay[dayEn] = src?.eventDate ? isoDayUTC(src.eventDate) : null;
      }),
    );
  }

  // Link "Criar mês seguinte": 1ª semana do mês após o último com dados,
  // já focando o 1º dia do novo mês (que costuma cair no meio da semana).
  const nextMonthWeekISO = isoDayUTC(startOfWeekUTC(nextMonthFirst));
  const nmDay = nextMonthFirst.getUTCDay();
  const nextMonthFirstDayEn = WEEKDAY_EN[nmDay === 0 ? 6 : nmDay - 1];
  const initialDay =
    dayParam && WEEKDAY_EN.includes(dayParam) ? dayParam : undefined;

  const weekLabel = `${formatDateUTC(weekStart)} – ${formatDateUTC(new Date(weekEnd.getTime() - DAY_MS))}`;

  // Painel de meses (arquivo/histórico): total e quantos arquivados por mês.
  const months: { ym: string; total: number; archived: number }[] = [];
  if (first?.eventDate && last?.eventDate) {
    const cur = new Date(Date.UTC(first.eventDate.getUTCFullYear(), first.eventDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(last.eventDate.getUTCFullYear(), last.eventDate.getUTCMonth(), 1));
    const specs: { ym: string; start: Date; stop: Date }[] = [];
    while (cur.getTime() <= end.getTime()) {
      const start = new Date(cur.getTime());
      const stop = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
      specs.push({
        ym: `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`,
        start,
        stop,
      });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    await Promise.all(
      specs.map(async (s) => {
        const [total, archived] = await Promise.all([
          prisma.tournament.count({ where: { eventDate: { gte: s.start, lt: s.stop } } }),
          prisma.tournament.count({ where: { eventDate: { gte: s.start, lt: s.stop }, archived: true } }),
        ]);
        months.push({ ym: s.ym, total, archived });
      }),
    );
    months.sort((a, b) => a.ym.localeCompare(b.ym));
  }

  return (
    <div className="mx-auto max-w-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`text-2xl font-semibold ${TEXT_PRIMARY}`}>Grade de Torneios</h1>
          <p className={`mt-1 text-sm ${TEXT_MUTED}`}>
            Base: USD e GMT-3. Cada torneio é único (editado por data). Edição
            inline nas colunas principais; use ⋯ para os demais campos.
          </p>
        </div>
        {canEdit ? (
          <Link
            href={`/admin/grade?week=${nextMonthWeekISO}&day=${nextMonthFirstDayEn}`}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            title="Vai ao mês seguinte (em branco) para construí-lo dia a dia"
          >
            + Criar mês seguinte
          </Link>
        ) : null}
      </div>

      {/* Navegação por semana */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <WeekNavButton href={`/admin/grade?week=${isoDayUTC(prevWeek)}`} enabled={hasPrev} label="‹ Semana anterior" />
        <span className={`text-sm font-medium ${TEXT_BODY}`}>Semana {weekLabel}</span>
        <WeekNavButton href={`/admin/grade?week=${isoDayUTC(nextWeek)}`} enabled={hasNext} label="Próxima semana ›" />
      </div>

      {/* Export Excel (leitura — ADMIN e OPERACIONAL) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={TEXT_MUTED}>Exportar esta semana:</span>
        <a
          href={`/admin/grade/export?from=${isoDayUTC(weekStart)}&to=${isoDayUTC(new Date(weekEnd.getTime() - DAY_MS))}&format=horizontal`}
          className={`rounded-lg border border-gray-200 dark:border-white/[0.12] px-3 py-1.5 font-medium ${TEXT_BODY} transition-colors hover:border-gray-300 dark:hover:border-white/[0.2] hover:bg-gray-50 dark:hover:bg-white/[0.04]`}
        >
          ⬇ Horizontal (base)
        </a>
        <a
          href={`/admin/grade/export?from=${isoDayUTC(weekStart)}&to=${isoDayUTC(new Date(weekEnd.getTime() - DAY_MS))}&format=vertical`}
          className={`rounded-lg border border-gray-200 dark:border-white/[0.12] px-3 py-1.5 font-medium ${TEXT_BODY} transition-colors hover:border-gray-300 dark:hover:border-white/[0.2] hover:bg-gray-50 dark:hover:bg-white/[0.04]`}
        >
          ⬇ Vertical (transposto)
        </a>
      </div>

      {/* Painel de meses — arquivo/histórico */}
      {months.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={TEXT_MUTED}>Meses:</span>
          {months.map((m) => {
            const isArchived = m.total > 0 && m.archived === m.total;
            const toggle = setMonthArchived.bind(null, m.ym, !isArchived);
            return (
              <span
                key={m.ym}
                className={
                  "inline-flex items-center gap-2 rounded-lg border px-2 py-1 " +
                  (isArchived
                    ? `${BORDER_SUBTLE} bg-gray-50 dark:bg-white/[0.03] ${TEXT_MUTED}`
                    : `border-gray-200 dark:border-white/[0.12] ${TEXT_BODY}`)
                }
              >
                <Link href={`/admin/grade?week=${isoDayUTC(startOfWeekUTC(new Date(m.ym + "-01T00:00:00Z")))}`} className="font-medium hover:underline">
                  {ymLabel(m.ym)}
                </Link>
                <span className="text-xs opacity-70">({m.total}){isArchived ? " · arquivado" : ""}</span>
                {canEdit ? (
                  <form action={toggle}>
                    <button
                      className={
                        "rounded px-1.5 py-0.5 text-xs font-medium " +
                        (isArchived
                          ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          : "text-amber-600 dark:text-amber-300 hover:bg-amber-500/10")
                      }
                      title={isArchived ? "Reabrir no portal" : "Fechar mês (sai do portal, vira histórico)"}
                    >
                      {isArchived ? "Desarquivar" : "Arquivar"}
                    </button>
                  </form>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}

      {!canEdit ? (
        <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">
          Modo somente leitura (Operacional). Você vê todos os dados e cálculos,
          mas não pode editar.
        </p>
      ) : null}

      <p className={`mt-4 text-sm ${TEXT_MUTED}`}>
        {tournaments.length} torneios nesta semana.
      </p>

      <div className="mt-2">
        <GradeTable
          tournaments={tournaments}
          canEdit={canEdit}
          weekStartISO={isoDayUTC(weekStart)}
          sourceByDay={sourceByDay}
          initialDay={initialDay}
        />
      </div>
    </div>
  );
}

function WeekNavButton({ href, enabled, label }: { href: string; enabled: boolean; label: string }) {
  const cls = "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors";
  if (!enabled) {
    return (
      <span className={`${cls} cursor-not-allowed ${BORDER_HAIRLINE} ${TEXT_MUTED}`}>
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={`${cls} border-gray-200 dark:border-white/[0.12] ${TEXT_BODY} hover:border-gray-300 dark:hover:border-white/[0.2] hover:bg-gray-50 dark:hover:bg-white/[0.04]`}>
      {label}
    </Link>
  );
}
