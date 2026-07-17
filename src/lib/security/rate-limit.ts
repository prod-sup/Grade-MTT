/**
 * Rate limiting leve (em memória, por processo) para pontos sensíveis a
 * força bruta/spam: login (backoffice e parceiro), recuperação de senha,
 * check-in público.
 * ---------------------------------------------------------------------------
 * LIMITAÇÃO CONHECIDA: por estar em memória, a contagem zera a cada restart
 * do processo e NÃO é compartilhada entre múltiplas instâncias/regiões. Para
 * um deploy horizontal (multi-instância), isso precisaria de um store
 * compartilhado (ex.: Redis). Para o volume/infra atual (instância única,
 * SQLite local), é uma mitigação real e de custo zero — muito melhor que a
 * ausência total de limite que existia antes.
 */
import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  /** Segundos até a janela resetar, quando `allowed` é false. */
  retryAfterSeconds?: number;
}

/** Verifica e incrementa o contador de `key`. Não lança — só reporta. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** IP do cliente a partir dos headers de proxy (best-effort; ausente em conexão direta). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** Limpeza periódica de buckets expirados — evita crescimento ilimitado do Map. */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  },
  10 * 60 * 1000,
).unref?.();
