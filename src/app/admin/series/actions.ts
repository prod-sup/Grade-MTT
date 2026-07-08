"use server";
/**
 * Server Actions do UPLOAD de Séries (Roadmap V2, item 4).
 * ---------------------------------------------------------------------------
 * Escrita restrita a ADMIN (checado dentro de cada action). O upload lê o Excel
 * no formato HORIZONTAL do export (coluna "Data" + rótulos de TOURNAMENT_FIELDS),
 * classifica cada linha contra a grade existente (verde/amarelo/vermelho/same) e
 * grava tudo em staging (SeriesImport + rows). Nada é aplicado no upload — o
 * admin confirma linha a linha depois.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth/dal";
import { classifyRow, type NamedTournament } from "@/lib/series/match";
import { parseSeriesWorkbook } from "@/lib/series/parse";

const DAY_MS = 86_400_000;
const WEEKDAY_EN = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export interface UploadState {
  error?: string;
}

function weekdayOrder(d: Date): number {
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

export async function uploadSeries(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) return { error: "Apenas administradores podem subir séries." };

  const seriesName = String(formData.get("seriesName") ?? "").trim();
  if (!seriesName) return { error: "Informe o nome da série (ex.: SPS)." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo .xlsx." };

  const buf = Buffer.from(await file.arrayBuffer());
  let parsed: ReturnType<typeof parseSeriesWorkbook>;
  try {
    parsed = parseSeriesWorkbook(buf);
  } catch {
    return { error: "Falha ao ler o Excel. Confirme que é o export Horizontal." };
  }
  if (parsed.error) return { error: parsed.error };
  if (parsed.rows.length === 0) return { error: "Nenhuma linha válida no arquivo." };

  // Candidatos existentes no intervalo do arquivo, agrupados por slot (data|hora).
  const dates = parsed.rows.map((r) => r.eventDate.getTime());
  const minD = new Date(Math.min(...dates));
  const maxD = new Date(Math.max(...dates) + DAY_MS);
  const existing = await prisma.tournament.findMany({
    where: { archived: false, eventDate: { gte: minD, lt: maxD } },
    select: { id: true, eventDate: true, startTime: true, shortName: true, name: true, gtd: true, buyIn: true },
  });
  const bySlot = new Map<string, NamedTournament[]>();
  for (const t of existing) {
    if (!t.eventDate) continue;
    const key = `${t.eventDate.toISOString().slice(0, 10)}|${t.startTime}`;
    const arr = bySlot.get(key) ?? [];
    arr.push(t);
    bySlot.set(key, arr);
  }

  // Cria o import e as linhas encenadas.
  const created = await prisma.seriesImport.create({
    data: { seriesName, filename: file.name, createdBy: actor?.id ?? null },
  });

  const stagingRows = parsed.rows.map((r, i) => {
    const slotKey = `${r.eventDate.toISOString().slice(0, 10)}|${r.startTime}`;
    const candidates = bySlot.get(slotKey) ?? [];
    const cls = classifyRow(
      { shortName: r.shortName, name: r.name, gtd: r.gtd, buyIn: r.buyIn },
      candidates,
    );
    const order = weekdayOrder(r.eventDate);
    // payload = dados p/ criar o torneio (category SERIES) ao confirmar.
    const payload = {
      ...r.fields,
      eventDate: r.eventDate.toISOString(),
      dayOfWeek: WEEKDAY_EN[order - 1],
      dayOrder: order,
      category: "SERIES",
      seriesName,
      archived: false,
      visible: r.fields.visible ?? true,
      featured: r.fields.featured ?? false,
      sourceSheet: `SERIE:${seriesName}`,
      sourceRow: i + 2,
    };
    return {
      importId: created.id,
      rowIndex: i,
      eventDate: r.eventDate,
      dayOfWeek: WEEKDAY_EN[order - 1],
      dayOrder: order,
      startTime: r.startTime,
      name: r.name,
      shortName: r.shortName,
      type: r.type,
      gtd: r.gtd,
      buyIn: r.buyIn,
      status: cls.status,
      matchBaseId: cls.matchBaseId ?? null,
      reviewNote: cls.reviewNote ?? null,
      resolved: cls.status === "SAME", // idênticos já ficam resolvidos (sem ação)
      payload: JSON.stringify(payload),
    };
  });

  const BATCH = 500;
  for (let i = 0; i < stagingRows.length; i += BATCH) {
    await prisma.seriesImportRow.createMany({ data: stagingRows.slice(i, i + BATCH) });
  }

  redirect(`/admin/series?import=${created.id}`);
}

// ---------------------------------------------------------------------------
// Aplicar / decidir linha a linha
// ---------------------------------------------------------------------------
export interface RowActionResult {
  ok: boolean;
  error?: string;
}

/** Cria o torneio da série a partir do payload da linha (category=SERIES). */
async function createFromPayload(payloadJson: string) {
  const p = JSON.parse(payloadJson) as Record<string, unknown>;
  const data: Record<string, unknown> = { ...p };
  data.eventDate = new Date(String(p.eventDate));
  // Garante escalares válidos p/ o Prisma (remove chaves desconhecidas).
  await prisma.tournament.create({ data: data as never });
}

/** Exclui um base (se houver) e cria a série, marcando a linha resolvida. */
async function replaceAndCreate(payloadJson: string, baseId: string | null) {
  await prisma.$transaction(async (tx) => {
    if (baseId) await tx.tournament.deleteMany({ where: { id: baseId } });
    const p = JSON.parse(payloadJson) as Record<string, unknown>;
    await tx.tournament.create({ data: { ...p, eventDate: new Date(String(p.eventDate)) } as never });
  });
}

/**
 * Confirma (SUBSTITUINDO) uma linha:
 *  - GREEN/YELLOW: exclui o base (o `replaceBaseId` informado, ou o casado) e cria a série.
 *  - RED:          cria a série (não exclui nada — não há base).
 *  - SAME:         nenhuma ação (apenas marca resolvido).
 */
export async function confirmRow(
  rowId: string,
  replaceBaseId?: string,
): Promise<RowActionResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) return { ok: false, error: "Apenas administradores." };

  const row = await prisma.seriesImportRow.findUnique({ where: { id: rowId } });
  if (!row) return { ok: false, error: "Linha não encontrada." };
  if (row.resolved) return { ok: true };

  try {
    if (row.status === "SAME") {
      // nada a criar; apenas resolve.
    } else if (row.status === "RED") {
      await createFromPayload(row.payload);
    } else {
      // GREEN / YELLOW: exclui o base indicado (ou o casado) e cria a série.
      await replaceAndCreate(row.payload, replaceBaseId ?? row.matchBaseId ?? null);
    }
    await prisma.seriesImportRow.update({ where: { id: rowId }, data: { resolved: true } });
  } catch {
    return { ok: false, error: "Falha ao aplicar a linha." };
  }

  revalidatePath("/admin/series");
  revalidatePath("/admin/grade");
  return { ok: true };
}

/**
 * Cria a linha como NOVO torneio, SEM excluir nenhum base (usado no RED e no
 * YELLOW quando o admin opta por "criar como novo").
 */
export async function createAsNew(rowId: string): Promise<RowActionResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) return { ok: false, error: "Apenas administradores." };

  const row = await prisma.seriesImportRow.findUnique({ where: { id: rowId } });
  if (!row) return { ok: false, error: "Linha não encontrada." };
  if (row.resolved) return { ok: true };

  try {
    if (row.status !== "SAME") await createFromPayload(row.payload);
    await prisma.seriesImportRow.update({ where: { id: rowId }, data: { resolved: true } });
  } catch {
    return { ok: false, error: "Falha ao criar a linha." };
  }

  revalidatePath("/admin/series");
  revalidatePath("/admin/grade");
  return { ok: true };
}

/** Pula uma linha (marca resolvida sem criar nada). */
export async function skipRow(rowId: string): Promise<RowActionResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) return { ok: false, error: "Apenas administradores." };
  await prisma.seriesImportRow.update({ where: { id: rowId }, data: { resolved: true } });
  revalidatePath("/admin/series");
  return { ok: true };
}

/** Descarta um import inteiro (staging). */
export async function discardImport(importId: string): Promise<void> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) redirect("/admin/grade?erro=somente-admin");
  await prisma.seriesImport.delete({ where: { id: importId } });
  redirect("/admin/series");
}
