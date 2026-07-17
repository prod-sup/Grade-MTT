import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  BORDER_SUBTLE,
  SURFACE_BG,
  SURFACE_ELEVATED_BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/lib/ui/premium";

export const metadata: Metadata = {
  title: "Entrar — Grade MTT",
};

export default async function LoginPage() {
  // Já autenticado? Vai direto ao painel.
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <main className={`flex min-h-screen items-center justify-center px-4 ${SURFACE_BG}`}>
      <ThemeToggle className="fixed top-4 right-4" />
      <div className={`w-full max-w-sm rounded-xl border p-8 shadow-sm ${BORDER_SUBTLE} ${SURFACE_ELEVATED_BG}`}>
        <div className="mb-6">
          <h1 className={`text-xl font-semibold ${TEXT_PRIMARY}`}>
            Grade MTT — Backoffice
          </h1>
          <p className={`mt-1 text-sm ${TEXT_SECONDARY}`}>
            Acesso restrito à equipe (Admin / Operacional).
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
