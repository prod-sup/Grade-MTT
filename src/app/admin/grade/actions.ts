"use server";
/**
 * Server Action de edição da grade (Fase 3). Escrita restrita a ADMIN — a
 * checagem acontece DENTRO da action. Chaves e tipos são validados contra a
 * allowlist de `fields.ts` (nunca confie no patch cru do cliente).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth/dal";
import { WEEKDAYS } from "@/lib/conversion";
import { EDITABLE_KEYS, FIELD_KINDS, TOURNAMENT_FIELDS } from "./fields";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// Campos String não-nulos no schema: não podem virar vazio/null.
const REQUIRED = new Set(["dayOfWeek", "startTime", "name", "type", "category"]);

const OPTIONS: Record<string, readonly string[]> = Object.fromEntries(
  TOURNAMENT_FIELDS.filter((f) => f.options).map((f) => [f.key, f.options!]),
);

type Coerced = { value: unknown } | { error: string };

function coerce(key: string, raw: unknown): Coerced {
  const kind = FIELD_KINDS[key];

  if (kind === "bool") {
    return { value: raw === true || raw === "true" || raw === "on" };
  }

  const s = raw == null ? "" : String(raw).trim();

  if (kind === "select") {
    if (!OPTIONS[key]?.includes(s)) return { error: `Valor inválido em "${key}".` };
    return { value: s };
  }

  if (kind === "number" || kind === "int") {
    if (s === "") return { value: null };
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n)) return { error: `Número inválido em "${key}".` };
    return { value: kind === "int" ? Math.round(n) : n };
  }

  // text
  if (s === "") {
    if (REQUIRED.has(key)) return { error: `"${key}" não pode ficar vazio.` };
    return { value: null };
  }
  return { value: s };
}

export async function updateTournament(
  id: string,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) {
    return { ok: false, error: "Apenas administradores podem editar a grade." };
  }
  if (!id) return { ok: false, error: "ID inválido." };

  const data: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(patch)) {
    if (!EDITABLE_KEYS.has(key)) {
      return { ok: false, error: `Campo não editável: ${key}` };
    }
    const result = coerce(key, raw);
    if ("error" in result) return { ok: false, error: result.error };
    data[key] = result.value;
  }

  if (Object.keys(data).length === 0) return { ok: true };

  // Se o dia da semana mudou, mantém dayOrder coerente (ordenação).
  if (typeof data.dayOfWeek === "string") {
    const w = WEEKDAYS.find((x) => x.en === data.dayOfWeek);
    if (w) data.dayOrder = w.order;
  }

  try {
    await prisma.tournament.update({ where: { id }, data });
  } catch {
    return { ok: false, error: "Falha ao salvar a alteração." };
  }

  revalidatePath("/admin/grade");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Construtor de mês — cópia dia a dia (Roadmap V2, item 3)
// ---------------------------------------------------------------------------
// "Criar mês seguinte" leva o admin ao mês novo em BRANCO. Cada dia vazio é
// preenchido copiando a ocorrência anterior daquele dia da semana (copyDay); há
// também o atalho de copiar a semana anterior inteira (copyWeek). Cada torneio
// é único: a cópia gera novas linhas (novos ids) na data alvo.

export interface CopyResult {
  ok: boolean;
  error?: string;
  created?: number;
  /** Data de origem copiada (YYYY-MM-DD). */
  sourceISO?: string;
  /** Nº de dias efetivamente copiados (copyWeek). */
  days?: number;
}

const WEEKDAY_EN: Record<number, string> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
  7: "SUNDAY",
};

const DAY_MS = 86_400_000;

/** Dia da semana 1=Segunda..7=Domingo a partir de uma data UTC. */
function weekdayOrder(d: Date): number {
  const js = d.getUTCDay(); // 0=Domingo..6=Sábado
  return js === 0 ? 7 : js;
}

function parseISO(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Clona uma linha de torneio para uma nova data (nova linha, sem id). */
function cloneRowToDate(
  row: Record<string, unknown>,
  target: Date,
  marker: string,
): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...row };
  delete clone.id;
  delete clone.createdAt;
  delete clone.updatedAt;
  const wd = weekdayOrder(target);
  clone.eventDate = target;
  clone.dayOfWeek = WEEKDAY_EN[wd];
  clone.dayOrder = wd;
  clone.sourceSheet = marker;
  clone.sourceRow = null;
  return clone;
}

async function rowsOnDate(date: Date) {
  const end = new Date(date.getTime() + DAY_MS);
  return prisma.tournament.findMany({
    where: { eventDate: { gte: date, lt: end } },
  });
}

/**
 * Copia para `targetISO` a ocorrência ANTERIOR mais recente do mesmo dia da
 * semana que tenha torneios. Recusa se a data alvo já tiver torneios.
 */
export async function copyDay(targetISO: string): Promise<CopyResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) {
    return { ok: false, error: "Apenas administradores podem copiar dias." };
  }
  const target = parseISO(targetISO);
  if (!target) return { ok: false, error: "Data alvo inválida." };

  const existing = await prisma.tournament.count({
    where: { eventDate: { gte: target, lt: new Date(target.getTime() + DAY_MS) } },
  });
  if (existing > 0) {
    return { ok: false, error: "Este dia já possui torneios." };
  }

  const dayEn = WEEKDAY_EN[weekdayOrder(target)];
  const src = await prisma.tournament.findFirst({
    where: { dayOfWeek: dayEn, eventDate: { lt: target } },
    orderBy: { eventDate: "desc" },
    select: { eventDate: true },
  });
  if (!src?.eventDate) {
    return { ok: false, error: `Não há ${dayEn} anterior para copiar.` };
  }

  const srcRows = await rowsOnDate(src.eventDate);
  const marker = `COPIA:${isoDay(src.eventDate)}`;
  const clones = srcRows.map((r) =>
    cloneRowToDate(r as Record<string, unknown>, target, marker),
  );

  const res = await prisma.tournament.createMany({ data: clones as never });
  revalidatePath("/admin/grade");
  return { ok: true, created: res.count, sourceISO: isoDay(src.eventDate) };
}

/**
 * Preenche a semana `targetWeekStartISO` (segunda) copiando a semana anterior
 * (target − 7 dias), dia a dia. Só preenche dias vazios (não sobrescreve).
 */
export async function copyWeek(targetWeekStartISO: string): Promise<CopyResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) {
    return { ok: false, error: "Apenas administradores podem copiar semanas." };
  }
  const weekStart = parseISO(targetWeekStartISO);
  if (!weekStart) return { ok: false, error: "Semana inválida." };

  let created = 0;
  let days = 0;
  const allClones: Record<string, unknown>[] = [];
  for (let i = 0; i < 7; i++) {
    const target = new Date(weekStart.getTime() + i * DAY_MS);
    const existing = await prisma.tournament.count({
      where: {
        eventDate: { gte: target, lt: new Date(target.getTime() + DAY_MS) },
      },
    });
    if (existing > 0) continue; // não sobrescreve

    const source = new Date(target.getTime() - 7 * DAY_MS);
    const srcRows = await rowsOnDate(source);
    if (srcRows.length === 0) continue;

    const marker = `COPIA:${isoDay(source)}`;
    for (const r of srcRows) {
      allClones.push(cloneRowToDate(r as Record<string, unknown>, target, marker));
    }
    days++;
  }

  if (allClones.length === 0) {
    return { ok: false, error: "Nada a copiar (semana anterior vazia ou dias já preenchidos)." };
  }

  const BATCH = 1000;
  for (let i = 0; i < allClones.length; i += BATCH) {
    const chunk = allClones.slice(i, i + BATCH);
    const res = await prisma.tournament.createMany({ data: chunk as never });
    created += res.count;
  }
  revalidatePath("/admin/grade");
  return { ok: true, created, days };
}

// ---------------------------------------------------------------------------
// Arquivar / desarquivar mês (Roadmap V2, item 5)
// ---------------------------------------------------------------------------
// Mês fechado → archived=true: sai do portal público (o portal filtra
// archived=false), mas continua no banco como histórico e visível no admin.
export async function setMonthArchived(ym: string, archived: boolean): Promise<void> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) redirect("/admin?erro=somente-admin");

  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) redirect("/admin/grade?erro=mes-invalido");
  const start = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  const end = new Date(Date.UTC(Number(m[1]), Number(m[2]), 1));

  await prisma.tournament.updateMany({
    where: { eventDate: { gte: start, lt: end } },
    data: { archived },
  });

  revalidatePath("/admin/grade");
  revalidatePath("/portal");
}
