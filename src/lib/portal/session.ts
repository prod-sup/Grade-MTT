/**
 * Sessão de VISITANTE do portal público (Fase 4 — Autenticação Simplificada).
 * ---------------------------------------------------------------------------
 * NÃO é autenticação real: apenas marca que o visitante passou pela landing de
 * check-in e carrega o contexto de exibição escolhido (handicap = moeda, fuso =
 * horário — independentes, conforme decisão do produto). Cookie httpOnly
 * assinado com HMAC (SESSION_SECRET), separado do cookie do backoffice.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const VISITOR_COOKIE = "grademtt_visitor";
export const VISITOR_TTL_MS = 1000 * 60 * 60 * 12; // 12h

export interface VisitorContext {
  /** AccessLog.id do check-in. */
  logId: string;
  name: string;
  /** Handicap escolhido (define a MOEDA). */
  handicapId: string;
  /** Fuso escolhido (define o HORÁRIO) — independente do handicap. */
  utcOffset: number;
  timezoneLabel: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET ausente ou muito curto (>= 16 chars).");
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

export function createVisitorToken(ctx: VisitorContext): string {
  const body = Buffer.from(JSON.stringify(ctx)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyVisitorToken(token: string): VisitorContext | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(sign(body));
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const ctx = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as VisitorContext;
    if (typeof ctx.exp !== "number" || ctx.exp < Date.now()) return null;
    if (!ctx.logId || !ctx.handicapId) return null;
    return ctx;
  } catch {
    return null;
  }
}

export async function setVisitorCookie(ctx: VisitorContext): Promise<void> {
  const store = await cookies();
  store.set(VISITOR_COOKIE, createVisitorToken(ctx), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(ctx.exp),
  });
}

export async function clearVisitorCookie(): Promise<void> {
  const store = await cookies();
  store.delete(VISITOR_COOKIE);
}

/** Lê o contexto do visitante (ou null se não fez check-in / expirou). */
export async function getVisitor(): Promise<VisitorContext | null> {
  const store = await cookies();
  const token = store.get(VISITOR_COOKIE)?.value;
  return token ? verifyVisitorToken(token) : null;
}
