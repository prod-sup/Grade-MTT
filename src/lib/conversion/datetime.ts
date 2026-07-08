/**
 * Conversão de fuso horário e formatação de data (Fase 2 — Motor de Conversão).
 * ---------------------------------------------------------------------------
 * Regra base (seção 4): todos os horários são armazenados na BASE GMT-3.
 * O Handicap do país escolhido define um `utcOffset`; a conversão desloca o
 * horário base pela diferença de offset — de forma apenas visual.
 *
 * Ao converter, o horário pode "vazar" para o dia anterior/seguinte (ex: um
 * torneio 23:00 GMT-3 vira 04:00 do dia seguinte em UTC+2). Por isso
 * `convertTime` também devolve o deslocamento de dia (`dayOffset`), que deve ser
 * aplicado ao dia da semana / à data exibida.
 */

/** Fuso base absoluto de armazenamento (GMT-3). */
export const BASE_UTC_OFFSET = -3;

export interface TimeConversionResult {
  /** Horário convertido no formato "HH:mm". */
  time: string;
  /** Deslocamento de dia em relação à base: -1 (dia anterior), 0, +1 (seguinte)… */
  dayOffset: number;
}

/** Faz o parse de "HH:mm" em minutos desde a meia-noite. Retorna null se inválido. */
function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function formatHHMM(minutes: number): string {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Converte um horário base (GMT-3, "HH:mm") para o fuso do handicap alvo.
 *
 * @param baseTime      Horário base no formato "HH:mm" (GMT-3).
 * @param targetUtcOffset Offset UTC do país escolhido (ex: -5, +8).
 * @param baseUtcOffset Offset base de armazenamento (padrão -3).
 */
export function convertTime(
  baseTime: string,
  targetUtcOffset: number,
  baseUtcOffset: number = BASE_UTC_OFFSET,
): TimeConversionResult | null {
  const base = parseHHMM(baseTime);
  if (base === null) return null;

  const diffMinutes = Math.round((targetUtcOffset - baseUtcOffset) * 60);
  const total = base + diffMinutes;

  const dayOffset = Math.floor(total / 1440);
  const wrapped = ((total % 1440) + 1440) % 1440;

  return { time: formatHHMM(wrapped), dayOffset };
}

// ---------------------------------------------------------------------------
// Dias da semana
// ---------------------------------------------------------------------------
// A base (planilha "G MTTS" / campo Tournament.dayOfWeek) usa rótulos em inglês.
// `order` segue o schema: 1=Segunda … 7=Domingo.

export interface Weekday {
  en: string;
  order: number;
  pt: string;
  ptShort: string;
}

export const WEEKDAYS: readonly Weekday[] = [
  { en: "MONDAY", order: 1, pt: "Segunda-feira", ptShort: "Seg" },
  { en: "TUESDAY", order: 2, pt: "Terça-feira", ptShort: "Ter" },
  { en: "WEDNESDAY", order: 3, pt: "Quarta-feira", ptShort: "Qua" },
  { en: "THURSDAY", order: 4, pt: "Quinta-feira", ptShort: "Qui" },
  { en: "FRIDAY", order: 5, pt: "Sexta-feira", ptShort: "Sex" },
  { en: "SATURDAY", order: 6, pt: "Sábado", ptShort: "Sáb" },
  { en: "SUNDAY", order: 7, pt: "Domingo", ptShort: "Dom" },
] as const;

const BY_EN = new Map(WEEKDAYS.map((w) => [w.en, w]));
// Índice por posição no ciclo (0=Segunda … 6=Domingo) para aritmética modular.
const CYCLE = WEEKDAYS.slice().sort((a, b) => a.order - b.order);

/** Nome em português do dia da semana a partir do rótulo em inglês. */
export function ptWeekday(en: string): string {
  return BY_EN.get(en.trim().toUpperCase())?.pt ?? en;
}

/**
 * Desloca um dia da semana por N dias (usa aritmética modular de 7 dias).
 * Ex: shiftWeekday("SUNDAY", 1) → "MONDAY". Usado quando a conversão de fuso
 * empurra o horário para outro dia.
 */
export function shiftWeekday(en: string, dayOffset: number): string {
  const current = BY_EN.get(en.trim().toUpperCase());
  if (!current) return en;
  const idx = current.order - 1; // 0-based
  const next = (((idx + dayOffset) % 7) + 7) % 7;
  return CYCLE[next].en;
}

// ---------------------------------------------------------------------------
// Datas concretas
// ---------------------------------------------------------------------------
// getDay() do JS: 0=Domingo … 6=Sábado. Mapeamento fixo para evitar depender
// de locale do ambiente (garante capitalização e acentuação corretas).
const JS_DAY_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/**
 * Formata uma data no padrão do projeto (seção 4):
 *   "Dia da Semana - DD/MM/AAAA"  (ex: "Segunda-feira - 13/07/2026")
 */
export function formatFullDate(date: Date): string {
  const weekday = JS_DAY_PT[date.getDay()];
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${weekday} - ${dd}/${mm}/${yyyy}`;
}

/**
 * Resolve a DATA CONCRETA de um torneio a partir do seu dia da semana (Roadmap
 * V2): a grade é um template semanal, então a data do flyer é derivada aqui.
 *
 * @param dayOrder   Ordem do dia (1=Segunda … 7=Domingo, como no schema).
 * @param weekOffset Deslocamento em semanas (0 = semana atual, +1 = próxima…).
 * @param from       Data de referência (padrão: hoje). Recebida como parâmetro
 *                   para ser testável/determinística.
 * @returns Data (à meia-noite local) da próxima ocorrência daquele dia da
 *          semana, deslocada por `weekOffset` semanas.
 */
export function nextDateForWeekday(
  dayOrder: number,
  weekOffset = 0,
  from: Date = new Date(),
): Date {
  const jsDay = from.getDay(); // 0=Domingo … 6=Sábado
  const todayOrder = jsDay === 0 ? 7 : jsDay; // 1=Segunda … 7=Domingo
  const daysUntil = (((dayOrder - todayOrder) % 7) + 7) % 7; // 0 = hoje
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  result.setDate(result.getDate() + daysUntil + weekOffset * 7);
  return result;
}
