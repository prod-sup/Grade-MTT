/**
 * Formatadores usados apenas na "Cápsula de Dados" dos flyers (Roadmap V2,
 * seção 2). Não confundir com `@/lib/conversion` (motor de câmbio/fuso da
 * grade) — aqui só formatamos texto de apresentação a partir de valores já
 * convertidos.
 */
import { formatMoney, ptWeekday } from "@/lib/conversion";
import type { FlyerTournament } from "./types";

/** GTD em fonte de destaque (ex: 5_000_000 → "5M", 500_000 → "500K"). */
export function formatCompactNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${trimTrailingZero(amount / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimTrailingZero(amount / 1_000)}K`;
  return String(Math.round(amount));
}

function trimTrailingZero(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** "Formato" da cápsula: PROG. K.O. / MYSTERY BOUNTY / REG. K.O. / ADD-ON / REGULAR. */
export function formatModality(
  koType: string | null | undefined,
  addon: number | null | undefined,
): string {
  const ko = (koType ?? "").trim();
  if (ko && ko.toUpperCase() !== "OFF") {
    if (/^progressive/i.test(ko)) return "PROG. K.O.";
    if (/^mystery/i.test(ko)) return "MYSTERY BOUNTY";
    if (/^regular/i.test(ko)) return "REG. K.O.";
    return ko.toUpperCase();
  }
  if (addon !== null && addon !== undefined && addon > 0) return "ADD-ON";
  return "REGULAR";
}

/** Formata o "Stack" (fichas iniciais) com separador de milhar pt-BR. */
export function formatStack(stackInicial: number | null | undefined): string {
  if (stackInicial === null || stackInicial === undefined) return "—";
  return new Intl.NumberFormat("pt-BR").format(stackInicial);
}

/** Linha "Late Reg" da cápsula: níveis + horário, quando disponíveis. */
export function formatLateReg(
  lateRegLevels: number | null | undefined,
  lateRegTime: string | null | undefined,
): string {
  const parts: string[] = [];
  if (lateRegLevels !== null && lateRegLevels !== undefined) parts.push(`${lateRegLevels} níveis`);
  if (lateRegTime) parts.push(lateRegTime);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

/** Linha "Blinds" da cápsula (blinds early, em minutos). */
export function formatBlinds(blindsEarly: number | null | undefined): string {
  return blindsEarly !== null && blindsEarly !== undefined ? `${blindsEarly} min` : "—";
}

function formatDateUTC(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/**
 * Mapeia um Tournament (BASE USD/GMT-3, sem conversão de visitante) para a
 * cápsula de dados do flyer. Usado por telas que trabalham na base (Admin,
 * Parceiro) — o portal público usa sua própria conversão (`convertTournament`)
 * antes de montar a `FlyerTournament`.
 */
export function toFlyerTournament(t: {
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
    buyIn: formatMoney(t.buyIn, "USD"),
    startTime: t.startTime,
    lateReg: formatLateReg(t.lateRegLevels, t.lateRegTime),
    blinds: formatBlinds(t.blindsEarly),
    stack: formatStack(t.stackInicial),
    currencyLabel: "USD",
  };
}
