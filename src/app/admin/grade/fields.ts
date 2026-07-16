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
  /** Para `kind: "select"`: como converter a opção (string) ao salvar. */
  valueType?: "int" | "percent";
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

// ---------------------------------------------------------------------------
// Opções travadas — fonte: "Lista dos menus suspensos.txt".
// ---------------------------------------------------------------------------
const TYPE_OPTIONS = ["Main Event", "Side Event", "Sat"] as const;
const GAME_TYPE_OPTIONS = ["NLH", "NLH SWAP", "PLO4", "PLO5", "PLO6", "6+ NLH"] as const;
const KO_TYPE_OPTIONS = [
  "Regular KO 1/4",
  "Regular KO 1/3",
  "Regular KO 1/2",
  "Regular KO 2/3",
  "Progressive KO 1/4",
  "Progressive KO 1/3",
  "Progressive KO 1/2",
  "Progressive KO 2/3",
  "Mystery Bounty 1/4",
  "Mystery Bounty 1/3",
  "Mystery Bounty 1/2",
  "Mystery Bounty 2/3",
  "OFF",
] as const;
const MAX_TABLE_OPTIONS = ["2", "4", "6", "7", "8", "9"] as const;
const PAYOUT_OPTIONS = [
  "10%",
  "10% New",
  "10% Plus",
  "10% Plus New",
  "10% Flat",
  "15%",
  "15% New",
  "15% Plus",
  "15% Flat",
  "20%",
  "20% Flat",
] as const;
const CALCULATED_PAYOUT_OPTIONS = ["Buy-in+Rebuy", "Only buy-in"] as const;
const REBUY_CONDITION_OPTIONS = [
  "Off (0)",
  "No Limit",
  "No limit + double rebuy",
  "1 Reentry",
  "2 Reentry",
  "3 Reentry",
  "4 Reentry",
  "5 Reentry",
] as const;
const BREAK_LATE_REG_OPTIONS = [
  "30 seg",
  "3 min",
  "5 min",
  "8 min",
  "10 min",
  "12 min",
  "15 min",
  "18 min",
  "20 min",
] as const;
const FEE_OPTIONS = ["0%", "1%", "2%", "3%", "4%", "5%", "8%", "10%", "12%", "15%"] as const;
const ADMIN_FEE_OPTIONS = ["0%", "1%", "2%", "3%", "4%", "5%"] as const;
const STRUCTURE_OPTIONS = [
  "Hyper turbo",
  "Turbo",
  "Regular (padrão)",
  "Regular - Ante off",
  "Turbo - Ante off",
  "Hyper Turbo - Ante off",
  "Ante Only",
  "Ante Only Turbo",
] as const;
const CHIPS_OPTIONS = [
  "1.000",
  "1.500",
  "2.000",
  "3.000",
  "5.000",
  "7.500",
  "10.000",
  "12.000",
  "15.000",
  "20.000",
  "30.000",
  "35.000",
  "40.000",
  "50.000",
  "60.000",
  "70.000",
  "80.000",
  "100.000",
] as const;
// Early game / Pós Late Reg. / Final Table compartilham as mesmas opções.
const BLINDS_OPTIONS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "12",
  "15",
  "20",
  "30",
  "45",
] as const;
const LATE_REG_OPTIONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
] as const;
const EARLY_BIRD_OPTIONS = [
  "Level 0 10%", "Level 0 20%", "Level 0 30%", "Level 0 40%", "Level 0 50%",
  "Level 1 10%", "Level 1 20%", "Level 1 30%", "Level 1 40%", "Level 1 50%",
  "Level 2 10%", "Level 2 20%", "Level 2 30%", "Level 2 40%", "Level 2 50%",
  "Level 3 10%", "Level 3 20%", "Level 3 30%", "Level 3 40%", "Level 3 50%",
  "Level 4 10%", "Level 4 20%", "Level 4 30%", "Level 4 40%", "Level 4 50%",
  "Level 5 10%", "Level 5 20%", "Level 5 30%", "Level 5 40%", "Level 5 50%",
] as const;
const CHAT_OPTIONS = ["Allow for everyone", "Only for in-game players", "Ban chat for everyone"] as const;
const TIME_BANK_OPTIONS = [
  "Off - ilimitado",
  "1X",
  "2X",
  "3X",
  "4X",
  "5X",
  "6X",
  "7X",
  "8X",
  "9X",
  "10X",
] as const;

export const TOURNAMENT_FIELDS: readonly FieldMeta[] = [
  // Agenda
  { key: "dayOfWeek", label: "Dia", kind: "select", options: WEEKDAY_KEYS, section: "Agenda", hot: true },
  { key: "dayOrder", label: "Ordem do dia", kind: "int", section: "Agenda" },
  { key: "startTime", label: "Horário (GMT-3)", kind: "text", section: "Agenda", hot: true },

  // Identificação
  { key: "shortName", label: "Nome", kind: "text", section: "Identificação", hot: true },
  { key: "name", label: "Nome (marketing)", kind: "text", section: "Identificação" },
  { key: "type", label: "Tipo", kind: "select", options: TYPE_OPTIONS, section: "Identificação", hot: true },
  { key: "gameType", label: "Modalidade", kind: "select", options: GAME_TYPE_OPTIONS, section: "Identificação", hot: true },
  { key: "koType", label: "K.O", kind: "select", options: KO_TYPE_OPTIONS, section: "Identificação" },

  // Financeiro (BASE USD)
  { key: "gtd", label: "GTD (USD)", kind: "number", section: "Financeiro", hot: true },
  { key: "buyIn", label: "Buy-in (USD)", kind: "number", section: "Financeiro", hot: true },
  { key: "fee", label: "Fee (%)", kind: "select", options: FEE_OPTIONS, valueType: "percent", section: "Financeiro", hot: true },
  { key: "adminFee", label: "Admin fee (%)", kind: "select", options: ADMIN_FEE_OPTIONS, valueType: "percent", section: "Financeiro", hot: true },
  { key: "reentry", label: "Reentry (USD)", kind: "number", section: "Financeiro" },
  { key: "addon", label: "Add-on (USD)", kind: "number", section: "Financeiro" },
  { key: "ticketAward", label: "Ticket award", kind: "text", section: "Financeiro" },
  { key: "personalizedAward", label: "Personalized award", kind: "text", section: "Financeiro" },
  { key: "payout", label: "Payout", kind: "select", options: PAYOUT_OPTIONS, section: "Financeiro" },
  { key: "calculatedPayout", label: "Calculated payout", kind: "select", options: CALCULATED_PAYOUT_OPTIONS, section: "Financeiro" },
  { key: "sizeBuyIn", label: "Size buy-in", kind: "text", section: "Financeiro" },
  { key: "action", label: "Action (dado bruto)", kind: "number", section: "Financeiro" },

  // Estrutura
  { key: "maxTable", label: "Max. table", kind: "select", options: MAX_TABLE_OPTIONS, valueType: "int", section: "Estrutura" },
  { key: "structure", label: "Structure", kind: "select", options: STRUCTURE_OPTIONS, section: "Estrutura" },
  { key: "stackInicial", label: "Chips (stack inicial)", kind: "select", options: CHIPS_OPTIONS, valueType: "int", section: "Estrutura" },
  { key: "stackReentry", label: "Stack reentry", kind: "int", section: "Estrutura" },
  { key: "stackAddon", label: "Stack add-on", kind: "text", section: "Estrutura" },
  { key: "rebuyCondition", label: "Rebuy condition", kind: "select", options: REBUY_CONDITION_OPTIONS, section: "Estrutura" },
  { key: "blindsEarly", label: "Blinds early (min)", kind: "select", options: BLINDS_OPTIONS, valueType: "int", section: "Estrutura" },
  { key: "blindsPostLateReg", label: "Blinds pós late reg (min)", kind: "select", options: BLINDS_OPTIONS, valueType: "int", section: "Estrutura" },
  { key: "blindsFinalTable", label: "Blinds final table (min)", kind: "select", options: BLINDS_OPTIONS, valueType: "int", section: "Estrutura" },
  { key: "breakLateReg", label: "Break late reg", kind: "select", options: BREAK_LATE_REG_OPTIONS, section: "Estrutura" },

  // Late registration
  { key: "lateRegLevels", label: "Late reg (níveis)", kind: "select", options: LATE_REG_OPTIONS, valueType: "int", section: "Late Reg" },
  { key: "lateRegTime", label: "Hora late reg (GMT-3)", kind: "text", section: "Late Reg" },

  // Operacional
  { key: "numPlayers", label: "Num. players", kind: "text", section: "Operacional" },
  { key: "earlyBird", label: "Early bird", kind: "select", options: EARLY_BIRD_OPTIONS, section: "Operacional" },
  { key: "chat", label: "Chat", kind: "select", options: CHAT_OPTIONS, section: "Operacional" },
  { key: "timeBank", label: "Time bank", kind: "select", options: TIME_BANK_OPTIONS, section: "Operacional" },

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

/** Mapa key → valueType, para coerção numérica/percentual de selects no servidor. */
export const VALUE_TYPES: Readonly<Record<string, "int" | "percent" | undefined>> = Object.fromEntries(
  TOURNAMENT_FIELDS.map((f) => [f.key, f.valueType]),
);

/** Conjunto de chaves editáveis permitidas (allowlist para a Server Action). */
export const EDITABLE_KEYS: ReadonlySet<string> = new Set(
  TOURNAMENT_FIELDS.map((f) => f.key),
);

export const HOT_FIELDS = TOURNAMENT_FIELDS.filter((f) => f.hot);

const FIELDS_BY_KEY = new Map(TOURNAMENT_FIELDS.map((f) => [f.key, f]));

/** Formata um valor cru do banco (fração/int) como a opção exibida no `<select>`. */
export function selectDisplayValue(key: string, value: unknown): string {
  if (value == null || value === "") return "";
  const field = FIELDS_BY_KEY.get(key);
  if (field?.valueType === "percent") return `${Math.round(Number(value) * 100)}%`;
  return String(value);
}
