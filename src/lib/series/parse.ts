/**
 * Parser do Excel de Séries (Roadmap V2, item 4) — puro/testável.
 * Lê o formato HORIZONTAL do export: coluna "Data" + rótulos de TOURNAMENT_FIELDS.
 */
import * as XLSX from "xlsx";
import { TOURNAMENT_FIELDS, FIELD_KINDS } from "@/app/admin/grade/fields";

export interface ParsedSeriesRow {
  eventDate: Date;
  startTime: string;
  name: string;
  shortName: string | null;
  type: string;
  gtd: number | null;
  buyIn: number | null;
  /** Todos os campos mapeados de TOURNAMENT_FIELDS (coerced). */
  fields: Record<string, unknown>;
}

export interface ParseResult {
  rows: ParsedSeriesRow[];
  error?: string;
}

const LABEL_TO_KEY = new Map(TOURNAMENT_FIELDS.map((f) => [f.label, f.key]));

/** "Data" (string ISO, dd/mm/yyyy, serial Excel ou Date) → Date UTC (00:00). */
export function parseCellDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date)
    return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v === "number" && v > 40000)
    return new Date(Math.round((v - 25569) * 86400 * 1000));
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v).trim());
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(v).trim());
  if (br) return new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1])));
  return null;
}

function coerceVal(key: string, raw: unknown): unknown {
  const kind = FIELD_KINDS[key];
  if (kind === "bool")
    return raw === true || raw === "Sim" || raw === "true" || raw === "on" || raw === 1;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  if (kind === "number" || kind === "int") {
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return kind === "int" ? Math.round(n) : n;
  }
  return s; // text / select
}

export function parseSeriesWorkbook(buf: Buffer | ArrayBuffer): ParseResult {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], error: "Planilha vazia." };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  if (aoa.length < 2) return { rows: [], error: "Sem linhas de dados." };

  const header = (aoa[0] as unknown[]).map((h) => String(h ?? "").trim());
  const colKey = header.map((h) => (h === "Data" ? "__date" : (LABEL_TO_KEY.get(h) ?? null)));
  if (!colKey.includes("__date"))
    return { rows: [], error: 'Coluna "Data" não encontrada (use o export Horizontal).' };

  const rows: ParsedSeriesRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = (aoa[r] as unknown[]) ?? [];
    const fields: Record<string, unknown> = {};
    let eventDate: Date | null = null;
    for (let c = 0; c < colKey.length; c++) {
      const key = colKey[c];
      if (!key) continue;
      if (key === "__date") eventDate = parseCellDate(row[c]);
      else fields[key] = coerceVal(key, row[c]);
    }
    const name = (fields.name as string) ?? null;
    const startTime = (fields.startTime as string) ?? null;
    if (!eventDate || !name || !startTime) continue;
    rows.push({
      eventDate,
      startTime,
      name,
      shortName: (fields.shortName as string) ?? null,
      type: (fields.type as string) ?? "Main Event",
      gtd: (fields.gtd as number) ?? null,
      buyIn: (fields.buyIn as number) ?? null,
      fields,
    });
  }
  return { rows };
}
