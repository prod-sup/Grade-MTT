/**
 * Helper de upload compartilhado para PNGs gerados/enviados no cliente
 * (dataURL) e gravados em `public/uploads/<subdir>/<filename>`. Extraído do
 * padrão já usado (privado) em `src/app/admin/marketing/actions.ts` — não
 * reescreve esse arquivo (código já em produção) para não correr risco à
 * toa; este helper é só para código novo.
 */
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_URL_PREFIX = "data:image/png;base64,";

/** Decodifica um PNG dataURL e grava em public/uploads/<subdir>/<filename>. Retorna a URL relativa. */
export async function saveDataUrlPng(
  subdir: string,
  filename: string,
  dataUrl: string,
): Promise<string> {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    throw new Error("Formato de imagem inválido (esperado PNG dataURL).");
  }
  const buffer = Buffer.from(dataUrl.slice(DATA_URL_PREFIX.length), "base64");
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
