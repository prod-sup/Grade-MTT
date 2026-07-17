/**
 * Tokens de estilo do design "Premium" (Landing, Portal, Tabela de Torneios,
 * Portal de Parceiros). Cada token é um PAR light/dark (`<claro> dark:<escuro>`)
 * — `dark:` responde à classe `.dark` no `<html>` (ver `@custom-variant dark`
 * em `globals.css` + `ThemeProvider` em `src/app/layout.tsx`), não mais a
 * `prefers-color-scheme`. Strings de classe Tailwind compartilhadas para
 * manter o gradiente dourado, o glass card e os glows consistentes entre
 * telas nos dois temas.
 */

export const GOLD_GRADIENT_BG =
  "bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11]";

export const GOLD_GRADIENT_TEXT = `${GOLD_GRADIENT_BG} bg-clip-text text-transparent`;

export const GOLD_BORDER = "border-[#b8860b]/40 dark:border-[#d4af37]/40";

export const GLASS_CARD =
  "bg-white/70 dark:bg-white/[0.03] backdrop-blur-md border border-gray-200/70 dark:border-white/[0.08] rounded-2xl";

export const GLASS_CARD_HOVER =
  "transition-all duration-200 hover:border-gray-300 dark:hover:border-white/[0.16] hover:bg-white dark:hover:bg-white/[0.05]";

export const GLOW_GOLD_HOVER = "hover:shadow-[0_0_20px_rgba(212,175,55,0.18)]";
export const GLOW_GOLD_STATIC = "shadow-[0_0_20px_rgba(212,175,55,0.10)]";
export const GLOW_WHITE_HOVER =
  "hover:shadow-[0_0_15px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.08)]";

/** Fundo principal — claro neutro / cinza-escuro rico (nunca preto puro). */
export const SURFACE_BG = "bg-gray-50 dark:bg-[#0b0c0e]";
export const SURFACE_ELEVATED_BG = "bg-white dark:bg-[#121316]";

/** Botão primário dourado (CTA) — o dourado é cor de marca, igual nos dois temas. */
export const GOLD_BUTTON = `${GOLD_GRADIENT_BG} text-black font-semibold rounded-xl transition-all duration-200 ${GLOW_GOLD_HOVER} hover:brightness-110 active:brightness-95`;

/** Botão secundário — contorno translúcido sobre o glass. */
export const GHOST_BUTTON =
  "rounded-xl border border-gray-300 dark:border-white/[0.12] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-200 transition-all duration-200 hover:border-gray-400 dark:hover:border-white/[0.2] hover:bg-gray-50 dark:hover:bg-white/[0.06]";

// --- Texto ------------------------------------------------------------------
export const TEXT_PRIMARY = "text-gray-900 dark:text-white";
/** Texto de conteúdo forte (nomes, valores) — um degrau abaixo de PRIMARY. */
export const TEXT_BODY = "text-gray-700 dark:text-gray-200";
export const TEXT_SECONDARY = "text-gray-500 dark:text-gray-400";
export const TEXT_MUTED = "text-gray-400 dark:text-gray-500";
/** Glifos bem discretos (separadores, placeholders de ícone). */
export const TEXT_FAINT = "text-gray-300 dark:text-gray-600";

// --- Bordas / divisores ------------------------------------------------------
export const BORDER_SUBTLE = "border-gray-200 dark:border-white/[0.08]";
export const BORDER_HAIRLINE = "border-gray-100 dark:border-white/[0.06]";

/** Hover de linha de tabela / item de lista sobre um SURFACE_ELEVATED_BG. */
export const ROW_HOVER = "hover:bg-gray-50 dark:hover:bg-white/[0.02]";
