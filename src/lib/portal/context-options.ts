/**
 * Monta as opções de contexto do portal (país/moeda + fuso) a partir dos
 * handicaps. Handicap e fuso são independentes: o fuso é uma lista deduplicada
 * dos fusos existentes nos handicaps. Função pura (usável em server e client).
 */
export interface HandicapInput {
  id: string;
  country: string;
  currencyLabel: string | null;
  utcOffset: number;
  timezoneLabel: string;
}

export interface HandicapOption {
  id: string;
  country: string;
  currencyLabel: string | null;
  /** Fuso do próprio país, no formato "<offset>|<label>". */
  fusoValue: string;
}

export interface FusoOption {
  value: string;
  label: string;
}

/** Codifica um fuso para o value de <option>. */
export function fusoValue(utcOffset: number, timezoneLabel: string): string {
  return `${utcOffset}|${timezoneLabel}`;
}

export function buildContextOptions(handicaps: HandicapInput[]): {
  handicaps: HandicapOption[];
  fusos: FusoOption[];
} {
  const handicapOptions: HandicapOption[] = handicaps.map((h) => ({
    id: h.id,
    country: h.country,
    currencyLabel: h.currencyLabel,
    fusoValue: fusoValue(h.utcOffset, h.timezoneLabel),
  }));

  // Fusos únicos, ordenados por offset crescente.
  const seen = new Map<string, FusoOption>();
  for (const h of [...handicaps].sort((a, b) => a.utcOffset - b.utcOffset)) {
    const value = fusoValue(h.utcOffset, h.timezoneLabel);
    if (!seen.has(value)) seen.set(value, { value, label: h.timezoneLabel });
  }

  return { handicaps: handicapOptions, fusos: [...seen.values()] };
}
