/**
 * Metadados dos campos do torneio (Fase 3).
 * Fonte única para: colunas inline "quentes" da tabela, formulário de detalhe
 * (drawer) e validação/coerção no servidor. Mantém a UI e a Server Action
 * sincronizadas com o schema Prisma.
 */
import { WEEKDAYS } from "@/lib/conversion";

export type FieldKind = "text" | "number" | "int" | "bool" | "select";

export interface FieldMeta {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  /** Seção no drawer de detalhe. */
  section: string;
  /** Aparece como coluna editável inline na tabela. */
  hot?: boolean;
}

const WEEKDAY_KEYS = WEEKDAYS.map((w) => w.en);
const CATEGORIES = [
  "GRADE",
  "SATELLITE",
  "FEATURED",
  "SERIES",
  "LIVE_SATELLITE",
] as const;

export const TOURNAMENT_FIELDS: readonly FieldMeta[] = [
  // Agenda
  { key: "dayOfWeek", label: "Dia", kind: "select", options: WEEKDAY_KEYS, section: "Agenda", hot: true },
  { key: "dayOrder", label: "Ordem do dia", kind: "int", section: "Agenda" },
  { key: "startTime", label: "Horário (GMT-3)", kind: "text", section: "Agenda", hot: true },

  // Identificação
  { key: "name", label: "Nome (marketing)", kind: "text", section: "Identificação", hot: true },
  { key: "shortName", label: "Nome curto", kind: "text", section: "Identificação" },
  { key: "type", label: "Tipo", kind: "text", section: "Identificação", hot: true },
  { key: "gameType", label: "Modalidade", kind: "text", section: "Identificação", hot: true },
  { key: "koType", label: "K.O", kind: "text", section: "Identificação" },

  // Financeiro (BASE USD)
  { key: "gtd", label: "GTD (USD)", kind: "number", section: "Financeiro", hot: true },
  { key: "buyIn", label: "Buy-in (USD)", kind: "number", section: "Financeiro", hot: true },
  { key: "fee", label: "Fee (fração)", kind: "number", section: "Financeiro", hot: true },
  { key: "adminFee", label: "Admin fee (fração)", kind: "number", section: "Financeiro", hot: true },
  { key: "reentry", label: "Reentry (USD)", kind: "number", section: "Financeiro" },
  { key: "addon", label: "Add-on (USD)", kind: "number", section: "Financeiro" },
  { key: "ticketAward", label: "Ticket award", kind: "text", section: "Financeiro" },
  { key: "personalizedAward", label: "Personalized award", kind: "text", section: "Financeiro" },
  { key: "payout", label: "Payout", kind: "text", section: "Financeiro" },
  { key: "calculatedPayout", label: "Calculated payout", kind: "text", section: "Financeiro" },
  { key: "sizeBuyIn", label: "Size buy-in", kind: "text", section: "Financeiro" },
  { key: "action", label: "Action (dado bruto)", kind: "number", section: "Financeiro" },

  // Estrutura
  { key: "maxTable", label: "Max. table", kind: "int", section: "Estrutura" },
  { key: "structure", label: "Structure", kind: "text", section: "Estrutura" },
  { key: "stackInicial", label: "Stack inicial", kind: "int", section: "Estrutura" },
  { key: "stackReentry", label: "Stack reentry", kind: "int", section: "Estrutura" },
  { key: "stackAddon", label: "Stack add-on", kind: "text", section: "Estrutura" },
  { key: "rebuyCondition", label: "Rebuy condition", kind: "text", section: "Estrutura" },
  { key: "blindsEarly", label: "Blinds early (min)", kind: "int", section: "Estrutura" },
  { key: "blindsPostLateReg", label: "Blinds pós late reg (min)", kind: "int", section: "Estrutura" },
  { key: "blindsFinalTable", label: "Blinds final table (min)", kind: "int", section: "Estrutura" },
  { key: "breakLateReg", label: "Break late reg", kind: "text", section: "Estrutura" },

  // Late registration
  { key: "lateRegLevels", label: "Late reg (níveis)", kind: "int", section: "Late Reg" },
  { key: "lateRegTime", label: "Hora late reg (GMT-3)", kind: "text", section: "Late Reg" },

  // Operacional
  { key: "numPlayers", label: "Num. players", kind: "text", section: "Operacional" },
  { key: "earlyBird", label: "Early bird", kind: "text", section: "Operacional" },
  { key: "chat", label: "Chat", kind: "text", section: "Operacional" },
  { key: "timeBank", label: "Time bank", kind: "text", section: "Operacional" },

  // Classificação / portal
  { key: "category", label: "Categoria", kind: "select", options: CATEGORIES, section: "Portal" },
  { key: "seriesName", label: "Nome da série", kind: "text", section: "Portal" },
  { key: "featured", label: "Destaque", kind: "bool", section: "Portal" },
  { key: "visible", label: "Visível no portal", kind: "bool", section: "Portal", hot: true },
] as const;

/** Mapa key → kind, para coerção/validação no servidor. */
export const FIELD_KINDS: Readonly<Record<string, FieldKind>> = Object.fromEntries(
  TOURNAMENT_FIELDS.map((f) => [f.key, f.kind]),
);

/** Conjunto de chaves editáveis permitidas (allowlist para a Server Action). */
export const EDITABLE_KEYS: ReadonlySet<string> = new Set(
  TOURNAMENT_FIELDS.map((f) => f.key),
);

export const HOT_FIELDS = TOURNAMENT_FIELDS.filter((f) => f.hot);
