"use server";
/**
 * Server Actions do portal público (Fase 4): check-in na landing, troca de
 * contexto (handicap/fuso) e saída. Não é auth real — só cria/atualiza o
 * AccessLog e a sessão de visitante.
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  setVisitorCookie,
  clearVisitorCookie,
  getVisitor,
  VISITOR_TTL_MS,
} from "@/lib/portal/session";

export interface CheckinState {
  error?: string;
}

/** Decodifica o valor do dropdown de fuso: "<offset>|<label>". */
function parseFuso(
  value: string,
  fallbackOffset: number,
  fallbackLabel: string,
): { utcOffset: number; timezoneLabel: string } {
  const [offsetRaw, ...labelParts] = value.split("|");
  const offset = Number(offsetRaw);
  const label = labelParts.join("|").trim();
  if (!Number.isFinite(offset) || !label) {
    return { utcOffset: fallbackOffset, timezoneLabel: fallbackLabel };
  }
  return { utcOffset: offset, timezoneLabel: label };
}

export async function checkin(
  _prev: CheckinState,
  formData: FormData,
): Promise<CheckinState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const club = String(formData.get("club") ?? "").trim() || null;
  const handicapId = String(formData.get("handicapId") ?? "").trim();
  const fusoValue = String(formData.get("fuso") ?? "").trim();

  if (!name || !email) return { error: "Informe nome e e-mail." };
  if (!handicapId) return { error: "Selecione um país/handicap." };

  const handicap = await prisma.handicap.findUnique({ where: { id: handicapId } });
  if (!handicap || !handicap.active) {
    return { error: "Handicap inválido." };
  }

  const { utcOffset, timezoneLabel } = parseFuso(
    fusoValue,
    handicap.utcOffset,
    handicap.timezoneLabel,
  );

  // Um registro por e-mail: atualiza (bumpa lastSeen via @updatedAt) ou cria.
  const existing = await prisma.accessLog.findFirst({
    where: { email },
    orderBy: { lastSeen: "desc" },
  });
  const log = existing
    ? await prisma.accessLog.update({
        where: { id: existing.id },
        data: { name, club, handicapId, timezoneLabel },
      })
    : await prisma.accessLog.create({
        data: { name, email, club, handicapId, timezoneLabel },
      });

  await setVisitorCookie({
    logId: log.id,
    name,
    handicapId,
    utcOffset,
    timezoneLabel,
    exp: Date.now() + VISITOR_TTL_MS,
  });

  redirect("/portal");
}

/** Troca handicap e/ou fuso sem novo check-in (seletor de contexto do header). */
export async function updateContext(
  handicapId: string,
  fusoValue: string,
): Promise<void> {
  const visitor = await getVisitor();
  if (!visitor) redirect("/");

  const handicap = await prisma.handicap.findUnique({ where: { id: handicapId } });
  if (!handicap || !handicap.active) return;

  const { utcOffset, timezoneLabel } = parseFuso(
    fusoValue,
    handicap.utcOffset,
    handicap.timezoneLabel,
  );

  // Mantém o AccessLog coerente com o contexto atual.
  await prisma.accessLog.update({
    where: { id: visitor.logId },
    data: { handicapId, timezoneLabel },
  }).catch(() => {});

  await setVisitorCookie({
    logId: visitor.logId,
    name: visitor.name,
    handicapId,
    utcOffset,
    timezoneLabel,
    exp: Date.now() + VISITOR_TTL_MS,
  });
}

export async function exitPortal(): Promise<void> {
  await clearVisitorCookie();
  redirect("/");
}
