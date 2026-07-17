"use server";
/**
 * Server Actions de autenticação do Parceiro (signup por convite, login,
 * recuperação de senha). Mesma checagem de segurança DENTRO da action
 * (Server Actions são endpoints POST públicos) já usada em `(auth)/actions.ts`.
 */
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/partner/password";
import {
  setPartnerSessionCookie,
  clearPartnerSessionCookie,
  PARTNER_SESSION_TTL_MS,
} from "@/lib/partner/session";
import { sendMail, buildAppUrl } from "@/lib/mail/mailer";

const MIN_PASSWORD_LENGTH = 8;
const RESET_TTL_MS = 1000 * 60 * 60; // 1 hora

export interface FormState {
  error?: string;
  message?: string;
}

/** Completa o cadastro a partir de um convite válido (token da query string). */
export async function completeSignup(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const contactName = String(formData.get("contactName") ?? "").trim();
  const clubName = String(formData.get("clubName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Convite inválido." };
  if (!contactName || !clubName || !password) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const passwordHash = hashPassword(password);

  const partner = await prisma.$transaction(async (tx) => {
    const invite = await tx.partnerInvite.findUnique({ where: { token } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null;

    const account = await tx.partnerAccount.upsert({
      where: { email: invite.email },
      update: { passwordHash, contactName, clubName, active: true },
      create: { email: invite.email, passwordHash, contactName, clubName },
    });
    await tx.partnerInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date(), partnerAccountId: account.id },
    });
    return account;
  });

  if (!partner) {
    return { error: "Convite inválido, expirado ou já utilizado." };
  }

  await setPartnerSessionCookie({
    pid: partner.id,
    email: partner.email,
    exp: Date.now() + PARTNER_SESSION_TTL_MS,
  });

  redirect("/partner/brand");
}

export async function partnerLogin(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const partner = await prisma.partnerAccount.findUnique({ where: { email } });
  const ok =
    partner?.active && partner.passwordHash && verifyPassword(password, partner.passwordHash);

  // Mensagem genérica — não revela se o e-mail existe.
  if (!ok || !partner) {
    return { error: "Credenciais inválidas." };
  }

  await setPartnerSessionCookie({
    pid: partner.id,
    email: partner.email,
    exp: Date.now() + PARTNER_SESSION_TTL_MS,
  });

  redirect("/partner");
}

export async function partnerLogout(): Promise<void> {
  await clearPartnerSessionCookie();
  redirect("/partner/login");
}

export async function requestPasswordReset(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Informe seu e-mail." };

  const partner = await prisma.partnerAccount.findUnique({ where: { email } });
  if (partner?.active) {
    const token = randomBytes(32).toString("hex");
    await prisma.partnerPasswordReset.create({
      data: { token, partnerAccountId: partner.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    const link = buildAppUrl(`/partner/reset-password?token=${token}`);
    await sendMail({
      to: partner.email,
      subject: "Redefinição de senha — Portal de Parceiros Suprema",
      html: `<p>Olá, ${partner.contactName}.</p><p>Clique no link abaixo para redefinir sua senha (expira em 1 hora):</p><p><a href="${link}">${link}</a></p>`,
    });
  }

  // Sempre a mesma mensagem — evita enumeração de e-mail cadastrado.
  return { message: "Se esse e-mail estiver cadastrado, enviamos um link de redefinição." };
}

export async function resetPassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Link inválido." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmPassword) return { error: "As senhas não coincidem." };

  const ok = await prisma.$transaction(async (tx) => {
    const reset = await tx.partnerPasswordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expiresAt < new Date()) return false;
    await tx.partnerAccount.update({
      where: { id: reset.partnerAccountId },
      data: { passwordHash: hashPassword(password) },
    });
    await tx.partnerPasswordReset.update({ where: { id: reset.id }, data: { used: true } });
    return true;
  });

  if (!ok) return { error: "Link inválido, expirado ou já utilizado." };

  redirect("/partner/login?reset=1");
}
