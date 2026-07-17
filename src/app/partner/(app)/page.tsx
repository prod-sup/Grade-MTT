import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/partner/dal";
import {
  GLASS_CARD,
  GLASS_CARD_HOVER,
  GOLD_GRADIENT_TEXT,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/lib/ui/premium";
import { StatusBanner } from "./brand/status-banner";

export default async function PartnerDashboardPage() {
  const partner = await requirePartner();
  const brand = await prisma.brandSettings.findUnique({ where: { partnerAccountId: partner.id } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className={`text-2xl font-semibold ${TEXT_PRIMARY}`}>Olá, {partner.contactName}</h1>
        <p className={`mt-1 text-sm ${TEXT_MUTED}`}>{partner.clubName}</p>
      </div>

      <StatusBanner
        status={(brand?.status as "PENDING" | "APPROVED" | "REJECTED") ?? "PENDING"}
        reviewNote={brand?.reviewNote ?? null}
        hasBrand={!!brand}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/partner/brand" className={`${GLASS_CARD} ${GLASS_CARD_HOVER} p-6`}>
          <p className={`text-sm font-semibold ${GOLD_GRADIENT_TEXT}`}>Minha Marca</p>
          <p className={`mt-2 text-sm ${TEXT_SECONDARY}`}>
            Envie sua logo, marca d&apos;água e telefone/ID do clube para aprovação.
          </p>
        </Link>
        <Link href="/partner/flyer" className={`${GLASS_CARD} ${GLASS_CARD_HOVER} p-6`}>
          <p className={`text-sm font-semibold ${GOLD_GRADIENT_TEXT}`}>Gerar Flyer</p>
          <p className={`mt-2 text-sm ${TEXT_SECONDARY}`}>
            Gere flyers oficiais da grade com sua marca aplicada (após aprovação).
          </p>
        </Link>
      </div>
    </div>
  );
}
