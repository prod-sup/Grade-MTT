/**
 * Conversão cambial (Fase 2 — Motor de Conversão).
 * ---------------------------------------------------------------------------
 * Regra base (seção 4 do projeto): todo valor é armazenado em USD (multiplicador
 * 1.00). A conversão para a moeda do país escolhido é feita APENAS de forma
 * visual no front-end, multiplicando o valor base pelo `multiplier` do Handicap.
 *
 * Sem APIs externas: o multiplicador é cadastrado manualmente na tabela Handicap.
 */

export const BASE_CURRENCY = "USD";

/** Multiplica um valor base (USD) pelo multiplicador do handicap. */
export function convertAmount(baseUsd: number, multiplier: number): number {
  return baseUsd * multiplier;
}

/**
 * Versão null-safe: propaga `null` para valores ausentes/ inválidos, em vez de
 * produzir `NaN`. Útil porque quase todo campo financeiro do torneio é opcional.
 */
export function convertAmountOrNull(
  baseUsd: number | null | undefined,
  multiplier: number,
): number | null {
  if (baseUsd === null || baseUsd === undefined || !Number.isFinite(baseUsd)) {
    return null;
  }
  return baseUsd * multiplier;
}

/**
 * Formata um valor monetário para exibição.
 *
 * Tenta usar o código ISO da moeda (ex: "BRL", "USD") via Intl. Se o rótulo não
 * for um código ISO válido (ex: um símbolo customizado), cai para um formato
 * numérico simples prefixado pelo rótulo.
 */
export function formatMoney(
  amount: number | null | undefined,
  currencyLabel?: string | null,
  locale = "pt-BR",
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—";
  }

  const code = (currencyLabel ?? BASE_CURRENCY).trim().toUpperCase();

  // Um código ISO 4217 válido tem exatamente 3 letras.
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
      }).format(amount);
    } catch {
      // Código com 3 letras porém não reconhecido — usa o fallback abaixo.
    }
  }

  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currencyLabel ? `${currencyLabel} ${number}` : number;
}
