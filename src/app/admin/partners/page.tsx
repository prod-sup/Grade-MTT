import { requireMarketing } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { TEXT_MUTED, TEXT_PRIMARY } from "@/lib/ui/premium";
import { PartnersManager, type InviteRow, type PartnerRow } from "./partners-manager";

export default async function AdminPartnersPage() {
  await requireMarketing();

  const [partners, invites] = await Promise.all([
    prisma.partnerAccount.findMany({ include: { brand: true }, orderBy: { createdAt: "desc" } }),
    prisma.partnerInvite.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const partnerRows: PartnerRow[] = partners.map((p) => ({
    id: p.id,
    email: p.email,
    contactName: p.contactName,
    clubName: p.clubName,
    active: p.active,
    brand: p.brand
      ? {
          id: p.brand.id,
          status: p.brand.status as "PENDING" | "APPROVED" | "REJECTED",
          reviewNote: p.brand.reviewNote,
          logoUrl: p.brand.logoUrl,
          watermarkUrl: p.brand.watermarkUrl,
          phoneText: p.brand.phoneText,
        }
      : null,
  }));

  const inviteRows: InviteRow[] = invites.map((i) => ({
    id: i.id,
    email: i.email,
    expiresAt: i.expiresAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-full">
      <h1 className={`text-2xl font-semibold ${TEXT_PRIMARY}`}>Parceiros</h1>
      <p className={`mt-1 text-sm ${TEXT_MUTED}`}>
        Convide parceiros (Ligas/Clubes/Agentes) e aprove ou recuse a marca (logo, marca
        d&apos;água, telefone) antes que ela apareça nos flyers deles.
      </p>

      <div className="mt-6">
        <PartnersManager partners={partnerRows} invites={inviteRows} />
      </div>
    </div>
  );
}
