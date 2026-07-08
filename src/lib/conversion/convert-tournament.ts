/**
 * Motor de conversão de torneio (Fase 2) — orquestra câmbio + fuso + cálculos.
 * ---------------------------------------------------------------------------
 * Recebe um torneio na BASE (USD / GMT-3) e um handicap (país escolhido) e
 * devolve a visão CONVERTIDA, apenas para exibição no front-end. Não muta nem
 * grava nada: a fonte da verdade continua em USD / GMT-3.
 */

import { convertAmountOrNull } from "./currency";
import { convertTime, shiftWeekday, type TimeConversionResult } from "./datetime";
import { computeField, type RakeOptions } from "./calculations";

/** Subconjunto do modelo Tournament usado na conversão (aceita o tipo Prisma). */
export interface TournamentBase {
  dayOfWeek: string;
  startTime: string;
  lateRegTime?: string | null;
  gtd?: number | null;
  buyIn?: number | null;
  fee?: number | null;
  adminFee?: number | null;
  reentry?: number | null;
  addon?: number | null;
}

/** Subconjunto do modelo Handicap usado na conversão. */
export interface HandicapContext {
  multiplier: number;
  utcOffset: number;
  currencyLabel?: string | null;
}

export interface ConvertedTournament {
  /** Moeda de exibição (ex: "BRL"). */
  currencyLabel: string | null;

  // --- Financeiro convertido (na moeda alvo) ---
  gtd: number | null;
  buyIn: number | null;
  reentry: number | null;
  addon: number | null;
  /** ⚠️ INTERNO — valor do rake convertido. NÃO exibir no portal público. */
  rake: number | null;

  // --- Horário convertido (fuso alvo) ---
  /** Dia da semana já ajustado pelo eventual "vazamento" de dia. */
  dayOfWeek: string;
  startTime: string;
  startDayOffset: number;
  lateRegTime: string | null;
  lateRegDayOffset: number;

  // --- Cálculo (adimensional, independe da moeda) ---
  /**
   * ⚠️ INTERNO — "AÇÕES": entradas necessárias para cobrir o GTD (Field).
   * Coluna do Admin. NÃO exibir no portal público (filtrar na Fase 4).
   */
  field: number | null;
}

/**
 * Converte um torneio base para a visão do país/handicap escolhido.
 *
 * @param options Repassado ao cálculo do Field (ex: `includeAdminFee`).
 */
export function convertTournament(
  t: TournamentBase,
  handicap: HandicapContext,
  options: RakeOptions = {},
): ConvertedTournament {
  const { multiplier, utcOffset, currencyLabel } = handicap;

  const start: TimeConversionResult | null = convertTime(t.startTime, utcOffset);
  const lateReg = t.lateRegTime ? convertTime(t.lateRegTime, utcOffset) : null;

  const field = computeField(
    { buyIn: t.buyIn, fee: t.fee, adminFee: t.adminFee, gtd: t.gtd },
    options,
  );

  return {
    currencyLabel: currencyLabel ?? null,

    gtd: convertAmountOrNull(t.gtd, multiplier),
    buyIn: convertAmountOrNull(t.buyIn, multiplier),
    reentry: convertAmountOrNull(t.reentry, multiplier),
    addon: convertAmountOrNull(t.addon, multiplier),
    rake: field ? field.rake * multiplier : null,

    // Se o parse do horário falhar, mantém o valor base e offset 0.
    dayOfWeek: shiftWeekday(t.dayOfWeek, start?.dayOffset ?? 0),
    startTime: start?.time ?? t.startTime,
    startDayOffset: start?.dayOffset ?? 0,
    lateRegTime: lateReg?.time ?? t.lateRegTime ?? null,
    lateRegDayOffset: lateReg?.dayOffset ?? 0,

    field: field?.requiredEntries ?? null,
  };
}
