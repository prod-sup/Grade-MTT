"use server";
/**
 * Server Action de edição da grade (Fase 3). Escrita restrita a ADMIN — a
 * checagem acontece DENTRO da action. Chaves e tipos são validados contra a
 * allowlist de `fields.ts` (nunca confie no patch cru do cliente).
 */
import { revalidatePath } from "next/cache";
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
