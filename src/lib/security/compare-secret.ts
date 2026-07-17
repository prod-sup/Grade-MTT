/**
 * Comparação de segredos em tempo constante (evita side-channel de timing).
 * `timingSafeEqual` exige buffers do MESMO tamanho — por isso comparamos o
 * hash SHA-256 de cada lado (sempre 32 bytes), não a string crua, o que
 * também permite comparar segredos de tamanhos diferentes sem vazar o
 * tamanho do segredo real via early-return de comprimento.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export function safeCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
