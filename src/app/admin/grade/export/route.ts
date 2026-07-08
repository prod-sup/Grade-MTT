/**
 * Export Excel da grade (Roadmap V2, Seção 1).
 * ---------------------------------------------------------------------------
 * GET /admin/grade/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=horizontal|vertical
 *
 * - LEITURA → liberado para ADMIN **e** OPERACIONAL (ambos autenticados).
 * - Formato base (calendário/global): HORIZONTAL — um torneio por LINHA, cada
 *   detalhe em COLUNA. É este o arquivo que o admin baixa, edita e sobe como
 *   série (mesmo layout que o parser de upload vai reler).
 * - VERTICAL = transposição (detalhes nas linhas, torneios nas colunas).
 *
 * Route Handlers não são cacheados por padrão (bom p/ export dinâmico).
 */
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/dal";
import { TOURNAMENT_FIELDS } from "../fields";

const DAY_MS = 86_400_000;

function startOfWeekUTC(d: Date): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
}
function parseISO(v: string | null): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type CellOut = string | number | boolean | null;

/** Formata um valor de célula p/ o Excel (bool legível; null → vazio). */
function fmt(value: unknown, kind: string): CellOut {
  if (value === null || value === undefined) return "";
  if (kind === "bool") return value ? "Sim" : "Não";
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const from = parseISO(searchParams.get("from")) ?? startOfWeekUTC(now);
  const toParam = parseISO(searchParams.get("to"));
  const to = toParam ?? new Date(from.getTime() + 6 * DAY_MS); // padrão: semana
  const format = searchParams.get("format") === "vertical" ? "vertical" : "horizontal";

  const rangeEnd = new Date(to.getTime() + DAY_MS); // exclusivo (inclui o dia "to")

  const rows = await prisma.tournament.findMany({
    where: { eventDate: { gte: from, lt: rangeEnd } },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });

  // Definição de colunas: Data + todos os campos do torneio.
  const columns: { header: string; get: (t: (typeof rows)[number]) => CellOut }[] = [
    { header: "Data", get: (t) => (t.eventDate ? isoDay(t.eventDate) : "") },
    ...TOURNAMENT_FIELDS.map((f) => ({
      header: f.label,
      get: (t: (typeof rows)[number]) =>
        fmt((t as Record<string, unknown>)[f.key], f.kind),
    })),
  ];

  let aoa: CellOut[][];
  if (format === "vertical") {
    // Transposto: cada LINHA é um campo; colunas = torneios.
    aoa = columns.map((c) => [c.header, ...rows.map((t) => c.get(t))]);
  } else {
    // Horizontal (base): cabeçalho + uma linha por torneio.
    aoa = [columns.map((c) => c.header), ...rows.map((t) => columns.map((c) => c.get(t)))];
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grade");
  const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const suffix = format === "vertical" ? "_vertical" : "";
  const filename = `grade_${isoDay(from)}_a_${isoDay(to)}${suffix}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
