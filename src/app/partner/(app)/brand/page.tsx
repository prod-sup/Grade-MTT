import { prisma } from "@/lib/prisma";
import { requirePartner } from "@/lib/partner/dal";
import { StatusBanner } from "./status-banner";
import { BrandForm } from "./brand-form";

export default async function PartnerBrandPage() {
  const partner = await requirePartner();
  const brand = await prisma.brandSettings.findUnique({ where: { partnerAccountId: partner.id } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Minha Marca</h1>
        <p className="mt-1 text-sm text-gray-500">
          Envie sua logo, marca d&apos;água e telefone/ID do clube. Depois de enviada (ou
          reenviada), a marca fica pendente até o Marketing aprovar.
        </p>
      </div>

      <StatusBanner
        status={(brand?.status as "PENDING" | "APPROVED" | "REJECTED") ?? "PENDING"}
        reviewNote={brand?.reviewNote ?? null}
        hasBrand={!!brand}
      />

      <BrandForm
        currentLogoUrl={brand?.logoUrl ?? null}
        currentWatermarkUrl={brand?.watermarkUrl ?? null}
        currentPhoneText={brand?.phoneText ?? ""}
      />
    </div>
  );
}
