import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPartner } from "@/lib/partner/dal";
import { GLASS_CARD, GLOW_GOLD_STATIC, TEXT_BODY, TEXT_MUTED } from "@/lib/ui/premium";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Portal de Parceiros",
};

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const partner = await getCurrentPartner();
  if (partner) redirect("/partner");
  const { reset } = await searchParams;

  return (
    <div className={`${GLASS_CARD} ${GLOW_GOLD_STATIC} p-8`}>
      {reset ? (
        <p className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Senha redefinida com sucesso. Faça login com a nova senha.
        </p>
      ) : null}

      <LoginForm />

      <p className={`mt-6 text-center text-xs ${TEXT_MUTED}`}>
        <Link
          href="/partner/forgot-password"
          className={`${TEXT_BODY} underline hover:text-gray-900 dark:hover:text-white`}
        >
          Esqueci minha senha
        </Link>
      </p>
    </div>
  );
}
