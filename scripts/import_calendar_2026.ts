/**
 * Importador da grade a partir de "Calendário MTT - 2026.xlsx" (Roadmap V2)
 * ---------------------------------------------------------------------------
 * O arquivo tem 12 abas mensais ("GRADE JANEIRO" … "GRADE DEZEMBRO"), cada uma
 * com o mês INTEIRO datado dia a dia (~100 torneios/dia).
 *
 * A grade é MENSAL e DATADA: cada mês difere (julho tem um festival, agosto
 * inicia a SPS etc.). Por isso importamos os meses COMPLETOS com a data real de
 * cada torneio (eventDate). Por padrão, de julho a dezembro/2026.
 *
 * Regras confirmadas pelo usuário (2026-07-08):
 *  - Importar de 01/07 a 31/12 (abas JULHO..DEZEMBRO).
 *  - As 3 colunas de "blinds up" (Early game / Pós Late Reg. / Final Table)
 *    existem a partir de julho. Em meses anteriores à atualização do app havia
 *    só "BLINDS UP" — nesse caso replicamos o valor para as duas à direita
 *    (salvaguarda; não se aplica a jul..dez).
 *  - No site/portal usar a coluna MTT (L → shortName), NÃO "MTT MARKETING"
 *    (J → name). Ambas são armazenadas; a escolha de exibição é no portal.
 *  - FEE e ADMIN FEE são exibidos em porcentagem (2%, 10%…) mas armazenados
 *    como fração (0.02, 0.10), exatamente como vêm na célula.
 *
 * Layout de colunas: IDÊNTICO à antiga aba "G MTTS" (A..AQ) — ver COL abaixo.
 *
 * Uso:
 *   npx tsx scripts/import_calendar_2026.ts --dry-run     (só valida o parsing)
 *   npx tsx scripts/import_calendar_2026.ts               (grava no banco)
 *   npx tsx scripts/import_calendar_2026.ts --months "GRADE JULHO,GRADE AGOSTO"
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { hashPassword } from "../src/lib/auth/password";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------
const EXCEL_PATH =
  process.argv.find((a) => a.endsWith(".xlsx")) ??
  path.resolve(process.cwd(), "Calendário MTT - 2026.xlsx");

const DRY_RUN = process.argv.includes("--dry-run");

// Abas a importar (padrão: julho → dezembro).
const DEFAULT_SHEETS = [
  "GRADE JULHO",
  "GRADE AGOSTO",
  "GRADE SETEMBRO",
  "GRADE OUTUBRO",
  "GRADE NOVEMBRO",
  "GRADE DEZEMBRO",
];
const monthsArgIdx = process.argv.indexOf("--months");
const SHEETS =
  monthsArgIdx >= 0
    ? process.argv[monthsArgIdx + 1].split(",").map((s) => s.trim())
    : DEFAULT_SHEETS;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Cell = string | number | boolean | Date | null | undefined;
type Row = Cell[];

interface TournamentSeed {
  eventDate: Date;
  archived: boolean;
  dayOfWeek: string;
  dayOrder: number;
  startTime: string;
  startFraction: number | null;
  name: string;
  shortName: string | null;
  type: string;
  gameType: string | null;
  koType: string | null;
  gtd: number | null;
  buyIn: number | null;
  fee: number | null;
  adminFee: number | null;
  reentry: number | null;
  addon: number | null;
  ticketAward: string | null;
  personalizedAward: string | null;
  payout: string | null;
  calculatedPayout: string | null;
  sizeBuyIn: string | null;
  action: number | null;
  maxTable: number | null;
  structure: string | null;
  stackInicial: number | null;
  stackReentry: number | null;
  stackAddon: string | null;
  rebuyCondition: string | null;
  blindsEarly: number | null;
  blindsPostLateReg: number | null;
  blindsFinalTable: number | null;
  breakLateReg: string | null;
  lateRegLevels: number | null;
  lateRegTime: string | null;
  numPlayers: string | null;
  earlyBird: string | null;
  chat: string | null;
  timeBank: string | null;
  category: string;
  seriesName: string | null;
  featured: boolean;
  visible: boolean;
  sourceSheet: string;
  sourceRow: number;
}

interface HandicapSeed {
  country: string;
  currencyLabel: string | null;
  multiplier: number;
  utcOffset: number;
  timezoneLabel: string;
  ianaTimezone: string | null;
  active: boolean;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Helpers de célula (mesma semântica do import_grade.ts)
// ---------------------------------------------------------------------------
const WEEKDAY_BY_ORDER: Record<number, string> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
  7: "SUNDAY",
};

function toStr(v: Cell): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  if (s === "" || s === "·" || s.toLowerCase() === "n/a") return null;
  return s;
}

function toNum(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = toStr(v);
  if (s === null) return null;
  const cleaned = s.replace(/[^\d.,-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === ",")
    return null;
  const n = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toInt(v: Cell): number | null {
  const n = toNum(v);
  return n === null ? null : Math.round(n);
}

/** Converte fração de dia do Excel (0..1) em "HH:mm". */
function fracToHHMM(v: Cell): string | null {
  const n = toNum(v);
  if (n === null) return null;
  let minutes = Math.round(n * 24 * 60);
  minutes = ((minutes % 1440) + 1440) % 1440;
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Data (00:00 UTC) a partir de um serial de data do Excel. */
function serialToDate(serial: number): Date {
  const ms = Math.round((serial - 25569) * 86400 * 1000); // 25569 = 1970-01-01
  return new Date(ms);
}

/** Dia da semana (1=Segunda..7=Domingo) a partir de uma data. */
function weekdayOrder(date: Date): number {
  const jsDay = date.getUTCDay(); // 0=Domingo..6=Sábado
  return jsDay === 0 ? 7 : jsDay;
}

function readSheet(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) {
    throw new Error(
      `Aba "${name}" não encontrada. Abas: ${wb.SheetNames.join(", ")}`,
    );
  }
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });
}

// ---------------------------------------------------------------------------
// Mapa de colunas (0-based) — idêntico à antiga aba "G MTTS"
// ---------------------------------------------------------------------------
const COL = {
  DAY: 0,
  HORA: 1, // base GMT-3 (fração do dia)
  NAME: 9, // J — MTT MARKETING
  SHORT_NAME: 11, // L — MTT
  TYPE: 12, // M
  GAME_TYPE: 13, // N
  KO: 14, // O
  MAX_TABLE: 15, // P
  PRIZE_POOL_USD: 16, // Q — GTD
  TICKET_AWARD: 17, // R
  PERSONALIZED_AWARD: 18, // S
  PAYOUT: 19, // T
  CALCULATED_PAYOUT: 20, // U
  BUY_IN: 21, // V
  REENTRY: 22, // W
  STACK_REENTRY: 23, // X
  REBUY_CONDITION: 24, // Y
  ADDON: 25, // Z
  STACK_ADDON: 26, // AA
  BREAK_LATE_REG: 27, // AB
  FEE: 28, // AC
  ADMIN_FEE: 29, // AD
  STRUCTURE: 30, // AE
  CHIPS: 31, // AF
  EARLY_GAME: 32, // AG
  POST_LATE_REG: 33, // AH
  FINAL_TABLE: 34, // AI
  LATE_REG: 35, // AJ
  NUM_PLAYERS: 36, // AK
  EARLY_BIRD: 37, // AL
  CHAT: 38, // AM
  TIME_BANK: 39, // AN
  HOUR_LATE_REG: 40, // AO
  ACTION: 41, // AP
  SIZE_BUY_IN: 42, // AQ
} as const;

/** Uma linha é banner de data se col A é serial de data (>40000) e col B (HORA) vazia. */
function dayBannerSerial(row: Row): number | null {
  const a = row[COL.DAY];
  const b = row[COL.HORA];
  if (typeof a === "number" && a > 40000 && (b === null || b === undefined)) {
    return a;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parsing: mês INTEIRO datado (cada torneio recebe sua eventDate)
// ---------------------------------------------------------------------------
function parseMonthDated(rows: Row[], sheetName: string): TournamentSeed[] {
  const out: TournamentSeed[] = [];
  let currentDate: Date | null = null;
  let currentOrder: number | null = null;
  let currentDay: string | null = null;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];

    // Novo dia (linha-banner com a data)?
    const serial = dayBannerSerial(row);
    if (serial !== null) {
      currentDate = serialToDate(serial);
      currentOrder = weekdayOrder(currentDate);
      currentDay = WEEKDAY_BY_ORDER[currentOrder] ?? null;
      continue;
    }

    if (currentDate === null || currentDay === null || currentOrder === null)
      continue;

    const name = toStr(row[COL.NAME]);
    const type = toStr(row[COL.TYPE]);
    const hora = row[COL.HORA];
    const horaNum = typeof hora === "number" ? hora : null;

    // Linha de torneio válida: nome + tipo + horário base numérico.
    if (!name || !type || horaNum === null) continue;

    // Salvaguarda blinds: se só houver Early game preenchido (meses pré-update),
    // replicar para as duas colunas à direita.
    let bEarly = toInt(row[COL.EARLY_GAME]);
    let bPost = toInt(row[COL.POST_LATE_REG]);
    let bFinal = toInt(row[COL.FINAL_TABLE]);
    if (bEarly !== null && bPost === null && bFinal === null) {
      bPost = bEarly;
      bFinal = bEarly;
    }

    out.push({
      eventDate: currentDate,
      archived: false,
      dayOfWeek: currentDay,
      dayOrder: currentOrder,
      startTime: fracToHHMM(horaNum) ?? "00:00",
      startFraction: horaNum,
      name,
      shortName: toStr(row[COL.SHORT_NAME]),
      type,
      gameType: toStr(row[COL.GAME_TYPE]),
      koType: toStr(row[COL.KO]),
      gtd: toNum(row[COL.PRIZE_POOL_USD]),
      buyIn: toNum(row[COL.BUY_IN]),
      fee: toNum(row[COL.FEE]),
      adminFee: toNum(row[COL.ADMIN_FEE]),
      reentry: toNum(row[COL.REENTRY]),
      addon: toNum(row[COL.ADDON]),
      ticketAward: toStr(row[COL.TICKET_AWARD]),
      personalizedAward: toStr(row[COL.PERSONALIZED_AWARD]),
      payout: toStr(row[COL.PAYOUT]),
      calculatedPayout: toStr(row[COL.CALCULATED_PAYOUT]),
      sizeBuyIn: toStr(row[COL.SIZE_BUY_IN]),
      action: toNum(row[COL.ACTION]),
      maxTable: toInt(row[COL.MAX_TABLE]),
      structure: toStr(row[COL.STRUCTURE]),
      stackInicial: toInt(row[COL.CHIPS]),
      stackReentry: toInt(row[COL.STACK_REENTRY]),
      stackAddon: toStr(row[COL.STACK_ADDON]),
      rebuyCondition: toStr(row[COL.REBUY_CONDITION]),
      blindsEarly: bEarly,
      blindsPostLateReg: bPost,
      blindsFinalTable: bFinal,
      breakLateReg: toStr(row[COL.BREAK_LATE_REG]),
      lateRegLevels: toInt(row[COL.LATE_REG]),
      lateRegTime: fracToHHMM(row[COL.HOUR_LATE_REG]),
      numPlayers: toStr(row[COL.NUM_PLAYERS]),
      earlyBird: toStr(row[COL.EARLY_BIRD]),
      chat: toStr(row[COL.CHAT]),
      timeBank: toStr(row[COL.TIME_BANK]),
      category: type.toUpperCase() === "SAT" ? "SATELLITE" : "GRADE",
      seriesName: null,
      featured: false,
      visible: true,
      sourceSheet: sheetName,
      sourceRow: r + 1,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Handicaps — lista fixa de "País referência - Handicaps - fusos.txt"
// ---------------------------------------------------------------------------
// currencyLabel é inferido (cosmético); revisar se necessário.
// Regras de moeda (2026-07-08): todo handicap 0,8x é exibido como USD;
// Colombia é BRL; Suprema Asia foi DESATIVADA (liga descontinuada).
const HANDICAPS: HandicapSeed[] = [
  { country: "Suprema Brasil", currencyLabel: "BRL", multiplier: 5.0, utcOffset: -3, timezoneLabel: "GMT-3", ianaTimezone: "America/Sao_Paulo", active: true, sortOrder: 0 },
  { country: "Suprema Europa", currencyLabel: "USD", multiplier: 0.8, utcOffset: 3, timezoneLabel: "GMT+3", ianaTimezone: null, active: true, sortOrder: 1 },
  { country: "Suprema Peru", currencyLabel: "PEN", multiplier: 3.5, utcOffset: -5, timezoneLabel: "GMT-5", ianaTimezone: "America/Lima", active: true, sortOrder: 2 },
  { country: "Suprema México", currencyLabel: "MXN", multiplier: 18.0, utcOffset: -6, timezoneLabel: "GMT-6", ianaTimezone: "America/Mexico_City", active: true, sortOrder: 3 },
  { country: "Suprema Argentina", currencyLabel: "USD", multiplier: 0.8, utcOffset: -3, timezoneLabel: "GMT-3", ianaTimezone: "America/Argentina/Buenos_Aires", active: true, sortOrder: 4 },
  { country: "Suprema Panamá", currencyLabel: "USD", multiplier: 0.8, utcOffset: -5, timezoneLabel: "GMT-5", ianaTimezone: "America/Panama", active: true, sortOrder: 5 },
  { country: "Suprema Colombia", currencyLabel: "BRL", multiplier: 5.0, utcOffset: -5, timezoneLabel: "GMT-5", ianaTimezone: "America/Bogota", active: true, sortOrder: 6 },
  { country: "Suprema Venezuela", currencyLabel: "USD", multiplier: 0.8, utcOffset: -4, timezoneLabel: "GMT-4", ianaTimezone: "America/Caracas", active: true, sortOrder: 7 },
  { country: "Suprema Bolívia", currencyLabel: "BOB", multiplier: 10.0, utcOffset: -4, timezoneLabel: "GMT-4", ianaTimezone: "America/La_Paz", active: true, sortOrder: 8 },
  { country: "Suprema Uruguai", currencyLabel: "USD", multiplier: 0.8, utcOffset: -3, timezoneLabel: "GMT-3", ianaTimezone: "America/Montevideo", active: true, sortOrder: 9 },
  { country: "Suprema Filipinas", currencyLabel: "PHP", multiplier: 60.0, utcOffset: -8, timezoneLabel: "GMT-8", ianaTimezone: "Asia/Manila", active: true, sortOrder: 10 },
];

// ---------------------------------------------------------------------------
// Usuários (RBAC)
// ---------------------------------------------------------------------------
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "suprema123";
const USERS = [
  { email: "admin@suprema.group", name: "Administrador", role: "ADMIN" },
  { email: "operacional@suprema.group", name: "Operacional", role: "OPERACIONAL" },
];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`📄 Lendo Excel: ${EXCEL_PATH}`);
  console.log(`📅 Abas: ${SHEETS.join(", ")}`);
  const buf = readFileSync(EXCEL_PATH);
  const wb = XLSX.read(buf, { type: "buffer" });

  const tournaments: TournamentSeed[] = [];
  const perMonth: Record<string, { count: number; dias: Set<string> }> = {};

  for (const sheet of SHEETS) {
    const rows = readSheet(wb, sheet);
    const parsed = parseMonthDated(rows, sheet);
    tournaments.push(...parsed);
    const dias = new Set(parsed.map((t) => isoDay(t.eventDate)));
    perMonth[sheet] = { count: parsed.length, dias };
    console.log(`  • ${sheet}: ${parsed.length} torneios em ${dias.size} dias`);
  }

  const byType = tournaments.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] ?? 0) + 1;
    return acc;
  }, {});
  const byCategory = tournaments.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});

  const dates = tournaments.map((t) => t.eventDate.getTime());
  const minDate = dates.length ? isoDay(new Date(Math.min(...dates))) : "—";
  const maxDate = dates.length ? isoDay(new Date(Math.max(...dates))) : "—";

  console.log("\n=== RESUMO DO PARSING (meses datados) ===");
  console.log(`Total de torneios: ${tournaments.length}`);
  console.log(`Intervalo de datas: ${minDate} → ${maxDate}`);
  console.log("Por tipo:", byType);
  console.log("Por categoria:", byCategory);
  console.log(`Handicaps a semear: ${HANDICAPS.length}`);
  console.log(
    "Handicaps:",
    HANDICAPS.map((h) => `${h.country}[x${h.multiplier}, ${h.timezoneLabel}]`).join(", "),
  );
  console.log("\nAmostra (primeiros 6):");
  for (const t of tournaments.slice(0, 6)) {
    console.log(
      `  ${isoDay(t.eventDate)} (${t.dayOfWeek}) ${t.startTime} | MTT="${t.shortName}" | ` +
        `${t.type}/${t.gameType} | GTD $${t.gtd} | BuyIn $${t.buyIn} | ` +
        `fee ${t.fee} adm ${t.adminFee} | blinds ${t.blindsEarly}/${t.blindsPostLateReg}/${t.blindsFinalTable}`,
    );
  }

  if (DRY_RUN) {
    console.log("\n🔎 --dry-run: nenhuma escrita no banco foi realizada.");
    return;
  }

  if (tournaments.length === 0) {
    throw new Error("Nenhum torneio parseado — abortando para não limpar o banco.");
  }

  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

  try {
    console.log("\n💾 Gravando no banco...");

    for (const u of USERS) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } });
      if (existing) {
        await prisma.user.update({
          where: { email: u.email },
          data: {
            name: u.name,
            role: u.role,
            passwordHash: existing.passwordHash ?? hashPassword(DEFAULT_PASSWORD),
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email: u.email,
            name: u.name,
            role: u.role,
            passwordHash: hashPassword(DEFAULT_PASSWORD),
          },
        });
      }
    }
    console.log(`  ✔ Usuários: ${USERS.length}`);

    await prisma.handicap.deleteMany();
    for (const h of HANDICAPS) await prisma.handicap.create({ data: h });
    console.log(`  ✔ Handicaps: ${HANDICAPS.length}`);

    await prisma.tournament.deleteMany();
    const BATCH = 1000;
    let inserted = 0;
    for (let i = 0; i < tournaments.length; i += BATCH) {
      const chunk = tournaments.slice(i, i + BATCH);
      const res = await prisma.tournament.createMany({ data: chunk });
      inserted += res.count;
    }
    console.log(`  ✔ Torneios: ${inserted}`);

    console.log("\n✅ Importação concluída.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Erro na importação:", err);
  process.exitCode = 1;
});
