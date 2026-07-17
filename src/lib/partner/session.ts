/**
 * Sessão do Parceiro — cookie httpOnly assinado (stateless), no mesmo formato
 * de `src/lib/auth/session.ts`, mas com cookie/TTL/payload próprios: é um
 * domínio de identidade separado do backoffice (ver PartnerAccount no
 * schema). Em Next 16 `cookies()` é ASSÍNCRONA.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const PARTNER_SESSION_COOKIE = "grademtt_partner";
/** Duração da sessão: 7 dias — usuário externo, sem urgência operacional de turno. */
export const PARTNER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface PartnerSessionPayload {
  /** PartnerAccount.id */
  pid: string;
  email: string;
  /** Expiração (epoch ms). */
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET ausente ou muito curto. Defina-o no .env (>= 16 chars).",
    );
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

/** Serializa e assina o payload em um token `<body>.<assinatura>`. */
export function createPartnerToken(payload: PartnerSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Valida assinatura + expiração e devolve o payload, ou null se inválido. */
export function verifyPartnerToken(token: string): PartnerSessionPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as PartnerSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (!payload.pid || !payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Grava o cookie de sessão. Só funciona em Server Action / Route Handler. */
export async function setPartnerSessionCookie(payload: PartnerSessionPayload): Promise<void> {
  const store = await cookies();
  store.set(PARTNER_SESSION_COOKIE, createPartnerToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.exp),
  });
}

/** Remove o cookie de sessão. Só funciona em Server Action / Route Handler. */
export async function clearPartnerSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PARTNER_SESSION_COOKIE);
}

/** Lê e valida o token do cookie atual. */
export async function readPartnerSession(): Promise<PartnerSessionPayload | null> {
  const store = await cookies();
  const token = store.get(PARTNER_SESSION_COOKIE)?.value;
  return token ? verifyPartnerToken(token) : null;
}
