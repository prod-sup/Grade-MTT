/**
 * Tokens de estilo do redesign "Premium Dark" (Landing, Portal, Tabela de
 * Torneios). Strings de classe Tailwind compartilhadas para manter o
 * gradiente dourado, o glass card e os glows consistentes entre telas.
 */

export const GOLD_GRADIENT_BG =
  "bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]";

export const GOLD_GRADIENT_TEXT = `${GOLD_GRADIENT_BG} bg-clip-text text-transparent`;

export const GOLD_BORDER = "border-[#d4af37]/40";

export const GLASS_CARD =
  "bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-2xl";

export const GLASS_CARD_HOVER =
  "transition-all duration-200 hover:border-white/[0.16] hover:bg-white/[0.05]";

export const GLOW_GOLD_HOVER = "hover:shadow-[0_0_20px_rgba(212,175,55,0.18)]";
export const GLOW_GOLD_STATIC = "shadow-[0_0_20px_rgba(212,175,55,0.10)]";
export const GLOW_WHITE_HOVER = "hover:shadow-[0_0_15px_rgba(255,255,255,0.08)]";

/** Fundo principal — cinza-escuro rico, não preto puro. */
export const SURFACE_BG = "bg-[#0b0c0e]";
export const SURFACE_ELEVATED_BG = "bg-[#121316]";

/** Botão primário dourado (CTA). */
export const GOLD_BUTTON = `${GOLD_GRADIENT_BG} text-black font-semibold rounded-xl transition-all duration-200 ${GLOW_GOLD_HOVER} hover:brightness-110 active:brightness-95`;

/** Botão secundário — contorno translúcido sobre o glass. */
export const GHOST_BUTTON =
  "rounded-xl border border-white/[0.12] bg-white/[0.03] text-gray-200 transition-all duration-200 hover:border-white/[0.2] hover:bg-white/[0.06]";
