import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Grade MTT",
};

export default async function LoginPage() {
  // Já autenticado? Vai direto ao painel.
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Grade MTT — Backoffice
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Acesso restrito à equipe (Admin / Operacional).
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
