import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/partner/dal";
import { toFlyerTournament } from "@/lib/flyer/format";
import type { PartnerOverlay } from "@/lib/flyer/types";
import { PartnerFlyerManager } from "./partner-flyer-manager";

const DAY_MS = 86_400_000;
// Janela de torneios oferecidos para compor um flyer (próximos 14 dias) —
// mesmo horizonte usado em /admin/marketing.
const HORIZON_DAYS = 14;

async function readAsDataUrl(relativeUrl: string | null): Promise<string | undefined> {
  if (!relativeUrl) return undefined;
  try {
    const buffer = await readFile(path.join(process.cwd(), "public", relativeUrl));
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export default async function PartnerFlyerPage() {
  const partner = await requirePartner();
  const brand = await prisma.brandSettings.findUnique({ where: { partnerAccountId: partner.id } });

  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const horizon = new Date(todayUTC.getTime() + HORIZON_DAYS * DAY_MS);

  const upcoming = await prisma.tournament.findMany({
    where: {
      visible: true,
      archived: false,
      category: { not: "SERIES" },
      eventDate: { gte: todayUTC, lte: horizon },
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });

  // Base USD/GMT-3 (sem conversão de visitante) — simplificação de MVP:
  // parceiros ainda não têm seletor de moeda/fuso próprio.
  const tournaments = upcoming.map(toFlyerTournament);

  let overlay: PartnerOverlay | undefined;
  if (brand?.status === "APPROVED") {
    const [logoDataUrl, watermarkDataUrl] = await Promise.all([
      readAsDataUrl(brand.logoUrl),
      readAsDataUrl(brand.watermarkUrl),
    ]);
    overlay = {
      logoDataUrl,
      watermarkDataUrl,
      phoneText: brand.phoneText ?? undefined,
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Gerar Flyer</h1>
        <p className="mt-1 text-sm text-gray-500">
          {brand?.status === "APPROVED"
            ? "Sua marca está aplicada automaticamente nos flyers gerados abaixo."
            : "Sua marca ainda não foi aprovada — os flyers saem sem a customização."}
        </p>
      </div>

      <PartnerFlyerManager tournaments={tournaments} overlay={overlay} />
    </div>
  );
}
