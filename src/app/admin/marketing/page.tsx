import { prisma } from "@/lib/prisma";
import { requireUser, canManageMarketing } from "@/lib/auth/dal";
import { formatMoney, ptWeekday } from "@/lib/conversion";
import {
  formatBlinds,
  formatCompactNumber,
  formatLateReg,
  formatModality,
  formatStack,
} from "@/lib/flyer/format";
import type { FlyerTournament } from "@/lib/flyer/types";
import { MarketingManager, type BannerRow } from "./marketing-manager";

const DAY_MS = 86_400_000;
// Janela de torneios oferecidos para compor um flyer novo (próximos 14 dias).
const HORIZON_DAYS = 14;

function formatDateUTC(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function toFlyerTournament(t: {
  id: string;
  eventDate: Date | null;
  dayOfWeek: string;
  startTime: string;
  shortName: string | null;
  name: string;
  koType: string | null;
  addon: number | null;
  gtd: number | null;
  buyIn: number | null;
  lateRegLevels: number | null;
  lateRegTime: string | null;
  blindsEarly: number | null;
  stackInicial: number | null;
}): FlyerTournament {
  return {
    id: t.id,
    dateLabel: t.eventDate ? formatDateUTC(t.eventDate) : "—",
    weekdayLabel: ptWeekday(t.dayOfWeek),
    name: t.shortName ?? t.name,
    modality: formatModality(t.koType, t.addon),
    gtdCompact: formatCompactNumber(t.gtd),
    // Painel do Admin trabalha na BASE (USD / GMT-3) — sem conversão de visitante.
    buyIn: formatMoney(t.buyIn, "USD"),
    startTime: t.startTime,
    lateReg: formatLateReg(t.lateRegLevels, t.lateRegTime),
    blinds: formatBlinds(t.blindsEarly),
    stack: formatStack(t.stackInicial),
    currencyLabel: "USD",
  };
}

export default async function MarketingPage() {
  const user = await requireUser();
  const canEdit = canManageMarketing(user);

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const horizon = new Date(todayUTC.getTime() + HORIZON_DAYS * DAY_MS);

  const [banners, upcoming] = await Promise.all([
    prisma.marketingBanner.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.tournament.findMany({
      where: {
        visible: true,
        archived: false,
        eventDate: { gte: todayUTC, lte: horizon },
      },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const gradeTournaments = upcoming
    .filter((t) => t.category !== "SERIES")
    .map(toFlyerTournament);
  const seriesRows = upcoming.filter((t) => t.category === "SERIES" && t.seriesName);
  const seriesNames = Array.from(new Set(seriesRows.map((t) => t.seriesName!))).sort();
  const seriesGroups = seriesNames.map((name) => ({
    seriesName: name,
    tournaments: seriesRows.filter((t) => t.seriesName === name).map(toFlyerTournament),
  }));

  const bannerRows: BannerRow[] = banners.map((b) => ({
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    type: b.type,
    seriesName: b.seriesName,
    active: b.active,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Marketing</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Geração e gestão dos flyers promocionais (Single/Duplo/Triplo/Lista) a partir da grade.
      </p>

      {!canEdit ? (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Modo somente leitura.
        </p>
      ) : null}

      <div className="mt-6">
        <MarketingManager
          banners={bannerRows}
          gradeTournaments={gradeTournaments}
          seriesGroups={seriesGroups}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
