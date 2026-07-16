"use server";
/**
 * Server Actions do painel de Marketing. Escrita restrita a ADMIN/MARKETING —
 * a checagem acontece DENTRO de cada action (fronteira de segurança real).
 */
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageMarketing } from "@/lib/auth/dal";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const BANNERS_DIR = path.join(process.cwd(), "public", "uploads", "banners");
const DATA_URL_PREFIX = "data:image/png;base64,";

/** Decodifica o PNG (dataURL) gerado no navegador e grava em /public/uploads/banners. */
async function saveBannerFile(id: string, dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    throw new Error("Formato de imagem inválido.");
  }
  const buffer = Buffer.from(dataUrl.slice(DATA_URL_PREFIX.length), "base64");
  await mkdir(BANNERS_DIR, { recursive: true });
  const filename = `${id}.png`;
  await writeFile(path.join(BANNERS_DIR, filename), buffer);
  return `/uploads/banners/${filename}`;
}

/** Cria um novo flyer/banner a partir do PNG gerado no cliente (html-to-image). */
export async function createMarketingBanner(input: {
  title: string;
  type: string;
  seriesName: string | null;
  dataUrl: string;
}): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageMarketing(actor)) {
    return { ok: false, error: "Sem permissão para gerenciar flyers de marketing." };
  }
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Informe um título para o flyer." };

  const id = randomUUID();
  let imageUrl: string;
  try {
    imageUrl = await saveBannerFile(id, input.dataUrl);
  } catch {
    return { ok: false, error: "Não foi possível salvar a imagem do flyer." };
  }

  await prisma.marketingBanner.create({
    data: {
      id,
      title,
      type: input.type,
      seriesName: input.seriesName,
      imageUrl,
      active: true,
    },
  });

  revalidatePath("/admin/marketing");
  return { ok: true };
}

export async function updateMarketingBanner(
  id: string,
  data: { title?: string; active?: boolean },
): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageMarketing(actor)) {
    return { ok: false, error: "Sem permissão para gerenciar flyers de marketing." };
  }
  if (!id) return { ok: false, error: "ID inválido." };

  const patch: { title?: string; active?: boolean } = {};
  if (data.title !== undefined) {
    const title = data.title.trim();
    if (!title) return { ok: false, error: "O título não pode ficar vazio." };
    patch.title = title;
  }
  if (data.active !== undefined) patch.active = data.active;

  try {
    await prisma.marketingBanner.update({ where: { id }, data: patch });
  } catch {
    return { ok: false, error: "Não foi possível salvar." };
  }

  revalidatePath("/admin/marketing");
  return { ok: true };
}

export async function deleteMarketingBanner(id: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!canManageMarketing(actor)) {
    return { ok: false, error: "Sem permissão para gerenciar flyers de marketing." };
  }
  if (!id) return { ok: false, error: "ID inválido." };

  const banner = await prisma.marketingBanner.findUnique({ where: { id } });
  try {
    await prisma.marketingBanner.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Não foi possível excluir." };
  }

  if (banner?.imageUrl.startsWith("/uploads/banners/")) {
    await unlink(path.join(process.cwd(), "public", banner.imageUrl)).catch(() => {});
  }

  revalidatePath("/admin/marketing");
  return { ok: true };
}
