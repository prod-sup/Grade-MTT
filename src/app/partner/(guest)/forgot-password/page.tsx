import type { Metadata } from "next";
import Link from "next/link";
import { GLASS_CARD, GLOW_GOLD_STATIC } from "@/lib/ui/premium";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha — Portal de Parceiros",
};

export default function ForgotPasswordPage() {
  return (
    <div className={`${GLASS_CARD} ${GLOW_GOLD_STATIC} p-8`}>
      <p className="mb-4 text-sm text-gray-400">
        Informe o e-mail cadastrado. Se ele existir, enviaremos um link para redefinir a senha.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-xs text-gray-500">
        <Link href="/partner/login" className="text-gray-300 underline hover:text-white">
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
