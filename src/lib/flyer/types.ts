/**
 * Tipos do motor de Flyers (Roadmap V2, seção 2 — Engenharia Visual de Flyers).
 * Cada torneio injetado num flyer chega já formatado para exibição (o cálculo
 * de moeda/fuso é feito no servidor, junto da grade); os componentes de
 * template só recebem strings prontas.
 */

export type FlyerLayout = "SINGLE" | "DOUBLE" | "TRIPLE" | "LIST";

/** Quantos torneios cada layout aceita (seção 2 do roadmap). */
export const FLYER_LAYOUT_LIMITS: Record<FlyerLayout, number> = {
  SINGLE: 1,
  DOUBLE: 2,
  TRIPLE: 3,
  LIST: 12,
};

export const FLYER_LAYOUT_LABELS: Record<FlyerLayout, string> = {
  SINGLE: "Flyer Single (1 torneio)",
  DOUBLE: "Flyer Duplo (2 torneios)",
  TRIPLE: "Flyer Triplo (3 torneios)",
  LIST: "Flyer Lista / Cronograma (até 12)",
};

export const FLYER_LAYOUT_ORDER: readonly FlyerLayout[] = ["SINGLE", "DOUBLE", "TRIPLE", "LIST"];

/**
 * Camada de marca de um Parceiro sobreposta ao flyer, só aplicada quando sua
 * `BrandSettings.status` é APPROVED. Imagens vêm como dataURL (não como URL
 * `/uploads/...`) para a captura via `html-to-image` nunca depender de um
 * fetch de rede — ver `src/components/flyer/stage.tsx`.
 */
export interface PartnerOverlay {
  logoDataUrl?: string;
  watermarkDataUrl?: string;
  phoneText?: string;
}

/** Dados de um torneio já prontos para injeção nas cápsulas do flyer. */
export interface FlyerTournament {
  id: string;
  dateLabel: string; // "13/07/2026"
  weekdayLabel: string; // "Segunda-feira"
  name: string;
  modality: string; // "PROG. K.O." | "ADD-ON" | "REGULAR" | ...
  gtdCompact: string; // "500K"
  buyIn: string; // já formatado na moeda do visitante
  startTime: string;
  lateReg: string;
  blinds: string;
  stack: string;
  currencyLabel: string;
}
