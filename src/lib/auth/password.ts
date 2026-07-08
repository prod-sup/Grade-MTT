/**
 * Hash e verificação de senha (Fase 3 — RBAC / Autenticação do backoffice).
 * ---------------------------------------------------------------------------
 * Usa apenas o módulo `crypto` nativo do Node (scrypt) — sem dependências
 * externas, mantendo a portabilidade. Formato armazenado em User.passwordHash:
 *
 *   scrypt$<saltHex>$<hashHex>
 *
 * OBS: este arquivo é PURO Node (sem APIs do Next), então também pode ser
 * importado pelo script de seed.
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** Gera o hash de uma senha em texto puro. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Verifica uma senha contra o hash armazenado (comparação em tempo constante). */
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = scryptSync(password, salt, expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
