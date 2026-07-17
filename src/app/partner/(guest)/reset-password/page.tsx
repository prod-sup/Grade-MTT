import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { GLASS_CARD, GLOW_GOLD_STATIC } from "@/lib/ui/premium";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha — Portal de Parceiros",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const reset = token ? await prisma.partnerPasswordReset.findUnique({ where: { token } }) : null;
  const valid = !!reset && !reset.used && reset.expiresAt > new Date();

  return (
    <div className={`${GLASS_CARD} ${GLOW_GOLD_STATIC} p-8`}>
      {!valid ? (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Link inválido, expirado ou já utilizado. Solicite um novo em &quot;Esqueci minha senha&quot;.
        </p>
      ) : (
        <ResetPasswordForm token={token!} />
      )}
    </div>
  );
}
