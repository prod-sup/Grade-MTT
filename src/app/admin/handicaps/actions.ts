"use server";
/**
 * Server Actions do painel de Handicaps (Fase 3). Escrita restrita a ADMIN —
 * a checagem acontece DENTRO de cada action (fronteira de segurança real).
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/auth/dal";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function numOr(v: FormDataEntryValue | null, fallback: number): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}
function intOr(v: FormDataEntryValue | null, fallback: number): number {
  const n = Math.round(numOr(v, fallback));
  return Number.isFinite(n) ? n : fallback;
}

/** Cria (id vazio) ou atualiza um handicap. */
export async function saveHandicap(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) {
    return { ok: false, error: "Apenas administradores podem editar handicaps." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  if (!country) return { ok: false, error: "Informe o país." };

  const data = {
    country,
    currencyLabel: strOrNull(formData.get("currencyLabel")),
    multiplier: numOr(formData.get("multiplier"), 1),
    utcOffset: numOr(formData.get("utcOffset"), -3),
    timezoneLabel:
      String(formData.get("timezoneLabel") ?? "").trim() || "GMT-3",
    ianaTimezone: strOrNull(formData.get("ianaTimezone")),
    active: formData.get("active") != null,
    sortOrder: intOr(formData.get("sortOrder"), 0),
  };

  try {
    if (id) {
      await prisma.handicap.update({ where: { id }, data });
    } else {
      await prisma.handicap.create({ data });
    }
  } catch {
    return {
      ok: false,
      error: `Não foi possível salvar. O país "${country}" já existe?`,
    };
  }

  revalidatePath("/admin/handicaps");
  return { ok: true };
}

export async function deleteHandicap(id: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!isAdmin(actor)) {
    return { ok: false, error: "Apenas administradores podem excluir handicaps." };
  }
  if (!id) return { ok: false, error: "ID inválido." };

  try {
    await prisma.handicap.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Não foi possível excluir." };
  }

  revalidatePath("/admin/handicaps");
  return { ok: true };
}
