/**
 * Helper de upload compartilhado para PNGs gerados/enviados no cliente
 * (dataURL) e gravados em `public/uploads/<subdir>/<filename>`. Extraído do
 * padrão já usado (privado) em `src/app/admin/marketing/actions.ts` — não
 * reescreve esse arquivo (código já em produção) para não correr risco à
 * toa; este helper é só para código novo.
 *
 * Validação de segurança (auditoria): o prefixo `data:image/png;base64,` no
 * input é só uma alegação do cliente — antes de gravar em disco, confirmamos
 * a assinatura binária real do PNG (magic bytes) e limitamos o tamanho
 * decodificado, para não aceitar bytes arbitrários (ex.: HTML/SVG com
 * script) disfarçados de PNG, nem payloads desproporcionais.
 */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_URL_PREFIX = "data:image/png;base64,";
/** Assinatura binária de um PNG válido (8 primeiros bytes). */
const PNG_MAGIC_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
/** Limite de tamanho decodificado — generoso o bastante p/ logo/marca d'água, sem abrir pra abuso. */
const MAX_DECODED_BYTES = 2 * 1024 * 1024; // 2MB

function isValidSegment(segment: string): boolean {
  // Bloqueia path traversal (`..`) e segmentos absolutos — defesa em
  // profundidade, mesmo que os chamadores atuais só passem valores próprios.
  return segment.length > 0 && !segment.includes("..") && !path.isAbsolute(segment);
}

/** Decodifica um PNG dataURL (validando conteúdo real e tamanho) e grava em public/uploads/<subdir>/<filename>. */
export async function saveDataUrlPng(
  subdir: string,
  filename: string,
  dataUrl: string,
): Promise<string> {
  if (!isValidSegment(subdir) || !isValidSegment(filename)) {
    throw new Error("Caminho de upload inválido.");
  }
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    throw new Error("Formato de imagem inválido (esperado PNG dataURL).");
  }

  const buffer = Buffer.from(dataUrl.slice(DATA_URL_PREFIX.length), "base64");

  if (buffer.length === 0 || buffer.length > MAX_DECODED_BYTES) {
    throw new Error("Imagem vazia ou maior que o limite permitido (2MB).");
  }
  if (!buffer.subarray(0, 8).equals(PNG_MAGIC_BYTES)) {
    throw new Error("Conteúdo não é um PNG válido.");
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`;
}

/** Remove um arquivo gravado por `saveDataUrlPng`, ignorando erro se já não existir. */
export async function deleteUploadedFile(relativeUrl: string): Promise<void> {
  if (!relativeUrl.startsWith("/uploads/")) return;
  await unlink(path.join(process.cwd(), "public", relativeUrl)).catch(() => {});
}
