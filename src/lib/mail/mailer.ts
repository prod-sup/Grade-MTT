/**
 * Envio de e-mail transacional (convite de parceiro, recuperação de senha).
 * ---------------------------------------------------------------------------
 * Usa SMTP via `nodemailer`, configurado inteiramente por variável de
 * ambiente (SMTP_HOST/PORT/USER/PASS/FROM). As credenciais ainda não foram
 * enviadas pelo T.I. do cliente neste momento — por isso `sendMail` NUNCA
 * lança: se `SMTP_HOST` estiver ausente, ou se o envio falhar por qualquer
 * motivo, ela só loga e retorna. As Server Actions que chamam isso sempre
 * criam o registro (convite/token de reset) no banco independente do e-mail
 * ter saído — o fluxo não pode travar por falta de configuração de e-mail.
 */
import nodemailer from "nodemailer";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) return null;

  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }
  return cachedTransport;
}

export async function sendMail({ to, subject, html }: SendMailInput): Promise<void> {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!transport || !from) {
    console.warn(
      `[mailer] SMTP não configurado — e-mail para "${to}" ("${subject}") não foi enviado (apenas logado).`,
    );
    return;
  }

  try {
    await transport.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error(`[mailer] Falha ao enviar e-mail para "${to}":`, err);
  }
}

/** Monta um link absoluto usando APP_BASE_URL (necessário fora do contexto de uma request). */
export function buildAppUrl(path: string): string {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
