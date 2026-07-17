import type { Metadata } from "next";
import Link from "next/link";
import { GLASS_CARD, GLOW_GOLD_STATIC, TEXT_BODY, TEXT_MUTED, TEXT_SECONDARY } from "@/lib/ui/premium";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha — Portal de Parceiros",
};

export default function ForgotPasswordPage() {
  return (
    <div className={`${GLASS_CARD} ${GLOW_GOLD_STATIC} p-8`}>
      <p className={`mb-4 text-sm ${TEXT_SECONDARY}`}>
        Informe o e-mail cadastrado. Se ele existir, enviaremos um link para redefinir a senha.
      </p>
      <ForgotPasswordForm />
      <p className={`mt-6 text-center text-xs ${TEXT_MUTED}`}>
        <Link href="/partner/login" className={`${TEXT_BODY} underline hover:text-gray-900 dark:hover:text-white`}>
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
