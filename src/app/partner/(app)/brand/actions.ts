"use server";
/**
 * Server Action de "Minha Marca". Reconfere a sessão do parceiro internamente
 * (mesmo padrão de `admin/marketing/actions.ts`: retorna `{ok:false,error}`
 * em vez de redirecionar, já que é chamada via `useTransition`, não um
 * `<form action>` de navegação).
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentPartner } from "@/lib/partner/dal";
import { saveDataUrlPng } from "@/lib/uploads";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function submitBrand(input: {
  logoDataUrl?: string;
  watermarkDataUrl?: string;
  phoneText: string;
}): Promise<ActionResult> {
  const partner = await getCurrentPartner();
  if (!partner) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const phoneText = input.phoneText.trim();
  if (!phoneText && !input.logoDataUrl && !input.watermarkDataUrl) {
    return { ok: false, error: "Envie ao menos a logo, a marca d'água ou o telefone/ID." };
  }

  const existing = await prisma.brandSettings.findUnique({
    where: { partnerAccountId: partner.id },
  });

  let logoUrl = existing?.logoUrl ?? null;
  let watermarkUrl = existing?.watermarkUrl ?? null;

  try {
    if (input.logoDataUrl) {
      logoUrl = await saveDataUrlPng(`partners/${partner.id}`, "logo.png", input.logoDataUrl);
    }
    if (input.watermarkDataUrl) {
      watermarkUrl = await saveDataUrlPng(
        `partners/${partner.id}`,
        "watermark.png",
        input.watermarkDataUrl,
      );
    }
  } catch {
    return { ok: false, error: "Falha ao salvar a imagem enviada." };
  }

  await prisma.brandSettings.upsert({
    where: { partnerAccountId: partner.id },
    update: {
      logoUrl,
      watermarkUrl,
      phoneText: phoneText || existing?.phoneText || null,
      status: "PENDING",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
    },
    create: {
      partnerAccountId: partner.id,
      logoUrl,
      watermarkUrl,
      phoneText: phoneText || null,
      status: "PENDING",
    },
  });

  revalidatePath("/partner/brand");
  revalidatePath("/partner");
  return { ok: true };
}
