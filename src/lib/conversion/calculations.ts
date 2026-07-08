/**
 * Cálculos e fórmulas internas obrigatórias (Fase 2 — Motor de Conversão).
 * ===========================================================================
 * REGRA DE GTD (seção 4, OBRIGATÓRIA):
 *   "O valor do Rake deve ser obrigatoriamente subtraído do Buy-in total ANTES
 *    de calcular o número de entradas necessárias para bater o Garantido (Field)."
 *
 * Interpretação CONFIRMADA pelo usuário (2026-07-08):
 *   - `buyIn` é o BUY-IN em USD.
 *   - `fee` e `adminFee` são FRAÇÕES do buy-in (ex: 0.10 = 10%, 0.02 = 2%).
 *   - Rake (valor)      = buyIn * fee
 *   - Admin fee (valor) = buyIn * adminFee
 *   - Parte que vai ao prize pool por entrada (prizeContribution)
 *                        = buyIn - rake - adminFee
 *   - Field / "AÇÕES" (entradas p/ cobrir o GTD) = ceil(GTD / prizeContribution)
 *
 *   Exemplo confirmado: buyIn 20 · fee 10% · adminFee 2% → deduz 2,40, sobram
 *   17,60 líquidos → GTD 5.000 → ceil(5000/17,6) = 285 ações.
 *
 * ⚠️ A coluna de AÇÕES (Field) é INTERNA do Admin — NÃO deve aparecer para os
 *    clientes no portal público (aplicar filtro na Fase 4).
 *
 * Notas:
 *   - O admin fee é deduzido junto do rake por padrão (`includeAdminFee: true`).
 *     Passe `false` apenas se, num cenário específico, o admin fee compuser o
 *     prêmio.
 *   - O Field considera apenas entradas de buy-in; reentries/add-ons NÃO entram.
 *   - O Field é uma CONTAGEM (adimensional) — não muda com a moeda (é uma razão
 *     GTD/contribuição). Logo independe do handicap cambial.
 */

export interface RakeInput {
  buyIn: number | null | undefined;
  /** FEE como fração do buy-in (ex: 0.1 = 10%). */
  fee?: number | null;
  /** ADMIN FEE como fração do buy-in (ex: 0.02 = 2%). */
  adminFee?: number | null;
}

export interface RakeOptions {
  /** Deduzir também o admin fee do prize pool. Padrão: true. */
  includeAdminFee?: boolean;
}

export interface RakeBreakdown {
  /** Buy-in total (USD). */
  buyIn: number;
  /** Fração de fee aplicada. */
  feeRate: number;
  /** Fração de admin fee aplicada. */
  adminFeeRate: number;
  /** Valor do rake em USD (buyIn * feeRate). */
  rake: number;
  /** Valor do admin fee em USD (buyIn * adminFeeRate). */
  adminFee: number;
  /** Soma deduzida do prize pool (rake + adminFee, conforme opção). */
  totalDeduction: number;
  /** Contribuição líquida ao prize pool por entrada (buyIn - totalDeduction). */
  prizeContribution: number;
}

/**
 * Decompõe o buy-in em rake, admin fee e contribuição ao prize pool.
 * Retorna `null` se não houver buy-in válido.
 */
export function computeRake(
  input: RakeInput,
  options: RakeOptions = {},
): RakeBreakdown | null {
  const { buyIn } = input;
  if (buyIn === null || buyIn === undefined || !Number.isFinite(buyIn) || buyIn <= 0) {
    return null;
  }

  const includeAdminFee = options.includeAdminFee ?? true;
  const feeRate = normalizeRate(input.fee);
  const adminFeeRate = normalizeRate(input.adminFee);

  const rake = buyIn * feeRate;
  const adminFee = buyIn * adminFeeRate;
  const totalDeduction = rake + (includeAdminFee ? adminFee : 0);
  const prizeContribution = buyIn - totalDeduction;

  return { buyIn, feeRate, adminFeeRate, rake, adminFee, totalDeduction, prizeContribution };
}

/** Trata frações nulas/negativas/NaN como 0. */
function normalizeRate(rate: number | null | undefined): number {
  if (rate === null || rate === undefined || !Number.isFinite(rate) || rate < 0) {
    return 0;
  }
  return rate;
}

/**
 * Número de entradas necessárias para bater o GTD (Field), dado quanto cada
 * entrada contribui líquido ao prize pool. Arredonda para cima (não dá para ter
 * fração de jogador). Retorna `null` se os insumos forem inválidos.
 */
export function requiredEntriesForGtd(
  gtd: number | null | undefined,
  prizeContributionPerEntry: number,
): number | null {
  if (gtd === null || gtd === undefined || !Number.isFinite(gtd) || gtd <= 0) {
    return null;
  }
  if (!Number.isFinite(prizeContributionPerEntry) || prizeContributionPerEntry <= 0) {
    return null;
  }
  return Math.ceil(gtd / prizeContributionPerEntry);
}

export interface FieldResult extends RakeBreakdown {
  /** Garantido (GTD) em USD usado no cálculo. */
  gtd: number;
  /** Entradas necessárias para bater o GTD. */
  requiredEntries: number;
}

/**
 * Aplica a REGRA DE GTD de ponta a ponta: decompõe o buy-in, subtrai o rake
 * (e admin fee) e calcula o Field. Retorna `null` se faltar buy-in ou GTD.
 */
export function computeField(
  input: RakeInput & { gtd?: number | null },
  options: RakeOptions = {},
): FieldResult | null {
  const breakdown = computeRake(input, options);
  if (!breakdown) return null;

  const requiredEntries = requiredEntriesForGtd(input.gtd, breakdown.prizeContribution);
  if (requiredEntries === null) return null;

  return { ...breakdown, gtd: input.gtd as number, requiredEntries };
}
