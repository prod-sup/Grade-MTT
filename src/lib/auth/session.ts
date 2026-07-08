/**
 * Sessão do backoffice (Fase 3) — cookie httpOnly assinado (stateless).
 * ---------------------------------------------------------------------------
 * Não usamos biblioteca de auth: o cookie carrega um payload assinado via
 * HMAC-SHA256 (chave em SESSION_SECRET). O servidor valida a assinatura e a
 * expiração a cada requisição. Em Next 16 `cookies()` é ASSÍNCRONA.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "grademtt_session";
/** Duração da sessão: 8 horas (alinhado à escala operacional 12/36). */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

export interface SessionPayload {
  /** User.id */
  uid: string;
  role: string;
  email: string;
  name: string;
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
export function createToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Valida assinatura + expiração e devolve o payload, ou null se inválido. */
export function verifyToken(token: string): SessionPayload | null {
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
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (!payload.uid || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Grava o cookie de sessão. Só funciona em Server Action / Route Handler. */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.exp),
  });
}

/** Remove o cookie de sessão. Só funciona em Server Action / Route Handler. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Lê e valida o token do cookie atual. */
export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}
