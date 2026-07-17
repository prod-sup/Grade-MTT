"use server";
/**
 * Server Actions da fila de Parceiros. Escrita restrita a ADMIN/MARKETING —
 * a checagem acontece DENTRO de cada action (fronteira de segurança real),
 * mesmo padrão de `admin/marketing/actions.ts`.
 */
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageMarketing } from "@/lib/auth/dal";
import { sendMail, buildAppUrl } from "@/lib/mail/mailer";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function inviteEmailHtml(link: string): string {
  return `<p>Você foi convidado a se cadastrar no Portal de Parceiros da Suprema Poker.</p><p><a href="${link}">${link}</a></p><p>Este link expira em 7 dias.</p>`;
}

export async function invitePartner(input: { email: string }): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManageMarketing(user)) return { ok: false, error: "Sem permissão." };

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { ok: false, error: "E-mail inválido." };

  const existing = await prisma.partnerAccount.findUnique({ where: { email } });
  if (existing?.active && existing.passwordHash) {
    return { ok: false, error: "Já existe uma conta de parceiro ativa com esse e-mail." };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.partnerInvite.create({
    data: {
      email,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedBy: user!.id,
    },
  });

  await sendMail({
    to: email,
    subject: "Convite — Portal de Parceiros Suprema",
    html: inviteEmailHtml(buildAppUrl(`/partner/signup?token=${token}`)),
  });

  revalidatePath("/admin/partners");
  return { ok: true };
}

export async function resendInvite(inviteId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManageMarketing(user)) return { ok: false, error: "Sem permissão." };

  const invite = await prisma.partnerInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return { ok: false, error: "Convite não encontrado." };

  const token = randomBytes(32).toString("hex");
  await prisma.partnerInvite.create({
    data: {
      email: invite.email,
      token,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedBy: user!.id,
    },
  });

  await sendMail({
    to: invite.email,
    subject: "Convite — Portal de Parceiros Suprema",
    html: inviteEmailHtml(buildAppUrl(`/partner/signup?token=${token}`)),
  });

  revalidatePath("/admin/partners");
  return { ok: true };
}

export async function approveBrand(brandId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManageMarketing(user)) return { ok: false, error: "Sem permissão." };

  await prisma.brandSettings.update({
    where: { id: brandId },
    data: { status: "APPROVED", reviewNote: null, reviewedBy: user!.id, reviewedAt: new Date() },
  });

  revalidatePath("/admin/partners");
  return { ok: true };
}

export async function rejectBrand(brandId: string, reviewNote: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManageMarketing(user)) return { ok: false, error: "Sem permissão." };

  const note = reviewNote.trim();
  if (!note) return { ok: false, error: "Informe o motivo da recusa." };

  await prisma.brandSettings.update({
    where: { id: brandId },
    data: { status: "REJECTED", reviewNote: note, reviewedBy: user!.id, reviewedAt: new Date() },
  });

  revalidatePath("/admin/partners");
  return { ok: true };
}

export async function togglePartnerActive(partnerId: string, active: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!canManageMarketing(user)) return { ok: false, error: "Sem permissão." };

  await prisma.partnerAccount.update({ where: { id: partnerId }, data: { active } });
  revalidatePath("/admin/partners");
  return { ok: true };
}
