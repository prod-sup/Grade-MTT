/**
 * Script de importação da grade MTT (Fase 1 — Carga de Dados Inicial)
 * ---------------------------------------------------------------------------
 * Lê o arquivo "Global MTT - Suprema Poker.xlsx" e popula o banco:
 *
 *   Aba "G MTTS"      → aba PRINCIPAL (Gestão / Base USD, GMT-3).
 *                       Fonte da verdade dos torneios. Todos os valores são
 *                       armazenados na BASE em USD (multiplicador 1.00) e todos
 *                       os horários na BASE GMT-3.
 *
 *   Aba "MTTS BRAZIL" → aba de CONVERSÃO (Brasil — Handicap 5.00).
 *                       Usada para derivar o multiplicador cambial do handicap
 *                       "Brasil (BRL)" (BRL = USD * multiplicador).
 *
 * Também semeia:
 *   - Usuários RBAC (Admin + Operacional).
 *   - Tabela de Handicaps: "Brasil (BRL)" + as regiões/fusos da aba "G MTTS".
 *
 * Uso:
 *   npm run db:seed              (grava no banco — requer migração já aplicada)
 *   npx tsx scripts/import_grade.ts --dry-run   (apenas valida o parsing)
 *
 * A conversão cambial/fuso NÃO é aplicada aqui; ela é dinâmica no front-end.
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
  path.resolve(process.cwd(), "Global MTT - Suprema Poker.xlsx");

const DRY_RUN = process.argv.includes("--dry-run");

const SHEET_MAIN = "G MTTS"; // aba principal (base USD / GMT-3)
const SHEET_BRAZIL = "MTTS BRAZIL"; // aba de conversão (handicap 5.00)

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Cell = string | number | boolean | null | undefined;
type Row = Cell[];

interface TournamentSeed {
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
// Helpers de célula
// ---------------------------------------------------------------------------
const WEEKDAYS_EN: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

function toStr(v: Cell): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, " ").trim();
  if (s === "" || s === "·" || s.toLowerCase() === "n/a") return null;
  return s;
}

function toNum(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = toStr(v);
  if (s === null) return null;
  // aceita "1.234,56", "1,234.56", "22", "0.4" etc — normaliza separadores simples
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

function isWeekdayEN(v: Cell): boolean {
  const s = toStr(v);
  return s !== null && Object.prototype.hasOwnProperty.call(WEEKDAYS_EN, s.toUpperCase());
}

/** Localiza a linha de cabeçalho (a que contém a célula "DAY"). */
function findHeaderRow(rows: Row[]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const first = toStr(rows[i]?.[0]);
    if (first && first.toUpperCase() === "DAY") return i;
  }
  return 3; // fallback observado nas planilhas atuais
}

function readSheet(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) {
    throw new Error(
      `Aba "${name}" não encontrada. Abas disponíveis: ${wb.SheetNames.join(", ")}`,
    );
  }
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null });
}

// ---------------------------------------------------------------------------
// Parsing da aba principal "G MTTS" (índices de coluna 0-based)
// ---------------------------------------------------------------------------
const COL = {
  DAY: 0,
  HORA: 1, // base GMT-3 (fração do dia)
  NAME: 9, // MTT MARKETING
  SHORT_NAME: 11, // MTT
  TYPE: 12,
  GAME_TYPE: 13,
  KO: 14,
  MAX_TABLE: 15,
  PRIZE_POOL_USD: 16, // GTD (USD)
  TICKET_AWARD: 17,
  PERSONALIZED_AWARD: 18,
  PAYOUT: 19,
  CALCULATED_PAYOUT: 20,
  BUY_IN: 21,
  REENTRY: 22,
  STACK_REENTRY: 23,
  REBUY_CONDITION: 24,
  ADDON: 25,
  STACK_ADDON: 26,
  BREAK_LATE_REG: 27,
  FEE: 28,
  ADMIN_FEE: 29,
  STRUCTURE: 30,
  CHIPS: 31,
  EARLY_GAME: 32,
  POST_LATE_REG: 33,
  FINAL_TABLE: 34,
  LATE_REG: 35,
  NUM_PLAYERS: 36,
  EARLY_BIRD: 37,
  CHAT: 38,
  TIME_BANK: 39,
  HOUR_LATE_REG: 40,
  ACTION: 41,
  SIZE_BUY_IN: 42,
} as const;

function parseMainSheet(rows: Row[]): TournamentSeed[] {
  const headerIdx = findHeaderRow(rows);
  const out: TournamentSeed[] = [];
  let currentDay: string | null = null;

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const nameCell = row[COL.NAME];

    // Linha separadora de dia: a coluna de nome contém um dia da semana.
    if (isWeekdayEN(nameCell)) {
      currentDay = String(nameCell).toUpperCase();
      continue;
    }
    // A coluna DAY também repete o dia — usa como fallback para manter o contexto.
    if (isWeekdayEN(row[COL.DAY])) {
      currentDay = String(row[COL.DAY]).toUpperCase();
    }

    const name = toStr(nameCell);
    const type = toStr(row[COL.TYPE]);
    const hora = toNum(row[COL.HORA]);

    // Linha de torneio válida precisa de nome, tipo e horário base numérico.
    if (!name || !type || hora === null) continue;
    if (!currentDay) continue; // sem dia definido, ignora

    out.push({
      dayOfWeek: currentDay,
      dayOrder: WEEKDAYS_EN[currentDay] ?? 0,
      startTime: fracToHHMM(hora) ?? "00:00",
      startFraction: hora,
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
      blindsEarly: toInt(row[COL.EARLY_GAME]),
      blindsPostLateReg: toInt(row[COL.POST_LATE_REG]),
      blindsFinalTable: toInt(row[COL.FINAL_TABLE]),
      breakLateReg: toStr(row[COL.BREAK_LATE_REG]),
      lateRegLevels: toInt(row[COL.LATE_REG]),
      lateRegTime: fracToHHMM(row[COL.HOUR_LATE_REG]),
      numPlayers: toStr(row[COL.NUM_PLAYERS]),
      earlyBird: toStr(row[COL.EARLY_BIRD]),
      chat: toStr(row[COL.CHAT]),
      timeBank: toStr(row[COL.TIME_BANK]),
      // "SAT" (satélites) alimenta a aba "Grade Satélites"; demais → "GRADE".
      category: type.toUpperCase() === "SAT" ? "SATELLITE" : "GRADE",
      seriesName: null,
      featured: false,
      visible: true,
      sourceSheet: SHEET_MAIN,
      sourceRow: r + 1, // 1-based (como no Excel)
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Parsing da aba "MTTS BRAZIL" — apenas para derivar o multiplicador
// ---------------------------------------------------------------------------
const BR_COL = { HORA: 1, NAME: 2, GTD: 6, BUY_IN: 7 } as const;

interface BrazilRef {
  name: string;
  frac: number | null;
  gtd: number | null;
  buyIn: number | null;
}

function parseBrazilSheet(rows: Row[]): BrazilRef[] {
  const headerIdx = findHeaderRow(rows);
  const out: BrazilRef[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const name = toStr(row[BR_COL.NAME]);
    if (!name) continue;
    out.push({
      name,
      frac: toNum(row[BR_COL.HORA]),
      gtd: toNum(row[BR_COL.GTD]),
      buyIn: toNum(row[BR_COL.BUY_IN]),
    });
  }
  return out;
}

/** Deriva o multiplicador BRL/USD comparando linhas equivalentes das duas abas. */
function deriveBrazilMultiplier(
  usd: TournamentSeed[],
  br: BrazilRef[],
): { multiplier: number; samples: number } {
  const key = (name: string, frac: number | null) =>
    `${name.toLowerCase()}|${frac === null ? "" : frac.toFixed(6)}`;

  const usdMap = new Map<string, TournamentSeed>();
  for (const t of usd) usdMap.set(key(t.name, t.startFraction), t);

  const ratios: number[] = [];
  for (const b of br) {
    const match = usdMap.get(key(b.name, b.frac));
    if (!match) continue;
    // prioriza buy-in; usa GTD como alternativa
    if (b.buyIn && match.buyIn && match.buyIn > 0) ratios.push(b.buyIn / match.buyIn);
    else if (b.gtd && match.gtd && match.gtd > 0) ratios.push(b.gtd / match.gtd);
  }

  if (ratios.length === 0) return { multiplier: 5.0, samples: 0 };
  ratios.sort((a, b) => a - b);
  const mid = Math.floor(ratios.length / 2);
  const median =
    ratios.length % 2 === 0 ? (ratios[mid - 1] + ratios[mid]) / 2 : ratios[mid];
  // arredonda para 2 casas (ex: 5.00)
  return { multiplier: Math.round(median * 100) / 100, samples: ratios.length };
}

// ---------------------------------------------------------------------------
// Handicaps: regiões/fusos da aba principal + Brasil (BRL) da aba de conversão
// ---------------------------------------------------------------------------
// Rótulos amigáveis para as colunas de fuso da aba "G MTTS".
const REGION_LABELS: Record<string, string> = {
  "Brazil/Arg": "Brasil/Argentina",
  EUA: "EUA",
  CANADÁ: "Canadá",
  "MÉX/CR": "México/Costa Rica",
  "PERU/COL": "Peru/Colômbia",
  VEZ: "Venezuela",
  EU: "Europa",
  ÁSIA: "Ásia",
};

function buildHandicaps(
  mainRows: Row[],
  brazilMultiplier: number,
): HandicapSeed[] {
  const headerIdx = findHeaderRow(mainRows);
  const countryRow = mainRows[headerIdx - 1] ?? []; // R2 — rótulos de país
  const headerRow = mainRows[headerIdx] ?? []; // R3 — "TIME (UTC-x)"

  const handicaps: HandicapSeed[] = [];
  let sort = 0;

  // Handicap principal de conversão: Brasil (BRL), fuso base GMT-3.
  handicaps.push({
    country: "Brasil (BRL)",
    currencyLabel: "BRL",
    multiplier: brazilMultiplier,
    utcOffset: -3,
    timezoneLabel: "GMT-3",
    ianaTimezone: "America/Sao_Paulo",
    active: true,
    sortOrder: sort++,
  });

  // Colunas de fuso (B..I → índices 1..8) da aba principal.
  for (let c = 1; c <= 8; c++) {
    const label = toStr(countryRow[c]);
    if (!label) continue;
    const country = REGION_LABELS[label] ?? label;
    if (country.startsWith("Brasil")) continue; // evita duplicar o Brasil base

    const timeHeader = toStr(headerRow[c]) ?? "";
    const m = timeHeader.match(/UTC\s*([+-]?\d+)/i);
    const offset = m ? Number(m[1]) : -3;

    handicaps.push({
      country,
      currencyLabel: "USD",
      multiplier: 1.0,
      utcOffset: offset,
      timezoneLabel: `UTC${offset >= 0 ? "+" : ""}${offset}`,
      ianaTimezone: null,
      active: true,
      sortOrder: sort++,
    });
  }

  return handicaps;
}

// ---------------------------------------------------------------------------
// Usuários (RBAC)
// ---------------------------------------------------------------------------
// Senha padrão dos usuários demo (defina SEED_PASSWORD no ambiente para trocar).
// ⚠️ Apenas para desenvolvimento — troque em produção.
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "suprema123";

const USERS = [
  { email: "admin@suprema.group", name: "Administrador", role: "ADMIN" },
  { email: "operacional@suprema.group", name: "Operacional", role: "OPERACIONAL" },
];

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
async function main() {
  console.log(`📄 Lendo Excel: ${EXCEL_PATH}`);
  const buf = readFileSync(EXCEL_PATH);
  const wb = XLSX.read(buf, { type: "buffer" });

  const mainRows = readSheet(wb, SHEET_MAIN);
  const brazilRows = readSheet(wb, SHEET_BRAZIL);

  const tournaments = parseMainSheet(mainRows);
  const brazilRefs = parseBrazilSheet(brazilRows);
  const { multiplier, samples } = deriveBrazilMultiplier(tournaments, brazilRefs);
  const handicaps = buildHandicaps(mainRows, multiplier);

  // Resumo
  const byDay = tournaments.reduce<Record<string, number>>((acc, t) => {
    acc[t.dayOfWeek] = (acc[t.dayOfWeek] ?? 0) + 1;
    return acc;
  }, {});
  const byType = tournaments.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n=== RESUMO DO PARSING ===");
  console.log(`Torneios encontrados: ${tournaments.length}`);
  console.log("Por dia:", byDay);
  console.log("Por tipo:", byType);
  console.log(
    `Multiplicador Brasil derivado: ${multiplier} (baseado em ${samples} pares casados)`,
  );
  console.log(`Handicaps a semear: ${handicaps.length}`);
  console.log(
    "Handicaps:",
    handicaps.map((h) => `${h.country}[x${h.multiplier}, ${h.timezoneLabel}]`).join(", "),
  );
  console.log("\nAmostra de torneios:");
  for (const t of tournaments.slice(0, 3)) {
    console.log(
      `  ${t.dayOfWeek} ${t.startTime} | ${t.name} | ${t.type}/${t.gameType} | ` +
        `GTD $${t.gtd} | BuyIn $${t.buyIn} | Fee $${t.fee}`,
    );
  }

  if (DRY_RUN) {
    console.log("\n🔎 --dry-run: nenhuma escrita no banco foi realizada.");
    return;
  }

  if (tournaments.length === 0) {
    throw new Error("Nenhum torneio parseado — abortando para não limpar o banco.");
  }

  // Importa o client e o adapter de forma dinâmica (permite --dry-run sem client gerado).
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

  try {
    console.log("\n💾 Gravando no banco...");

    // Usuários — cria se não existir; se existir sem senha, define a senha demo;
    // NUNCA sobrescreve uma senha já definida.
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
    console.log(
      `  ✔ Usuários: ${USERS.length} (senha demo p/ contas sem senha: "${DEFAULT_PASSWORD}")`,
    );

    // Handicaps — reseed limpo.
    await prisma.handicap.deleteMany();
    for (const h of handicaps) {
      await prisma.handicap.create({ data: h });
    }
    console.log(`  ✔ Handicaps: ${handicaps.length}`);

    // Torneios — reseed limpo.
    await prisma.tournament.deleteMany();
    const result = await prisma.tournament.createMany({ data: tournaments });
    console.log(`  ✔ Torneios: ${result.count}`);

    console.log("\n✅ Importação concluída.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Erro na importação:", err);
  process.exitCode = 1;
});
