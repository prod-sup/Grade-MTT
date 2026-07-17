import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { GLASS_CARD, GLOW_GOLD_STATIC } from "@/lib/ui/premium";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Cadastro de Parceiro — Grade MTT",
};

export default async function PartnerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invite = token ? await prisma.partnerInvite.findUnique({ where: { token } }) : null;
  const valid = !!invite && !invite.usedAt && invite.expiresAt > new Date();

  return (
    <div className={`${GLASS_CARD} ${GLOW_GOLD_STATIC} p-8`}>
      {!valid ? (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Convite inválido, expirado ou já utilizado. Solicite um novo convite ao seu contato na
          Suprema.
        </p>
      ) : (
        <SignupForm token={token!} email={invite!.email} />
      )}
    </div>
  );
}
