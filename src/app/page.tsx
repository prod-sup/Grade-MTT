import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getVisitor } from "@/lib/portal/session";
import { buildContextOptions } from "@/lib/portal/context-options";
import { CheckinForm } from "./checkin-form";

export const metadata: Metadata = {
  title: "Grade MTT — Suprema",
};

// Landing pública (seção 7). Check-in cria o AccessLog + a sessão de visitante.
export default async function Home() {
  const visitor = await getVisitor();
  if (visitor) redirect("/portal");

  const rows = await prisma.handicap.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
  });

  const { handicaps, fusos } = buildContextOptions(rows);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Grade MTT — Suprema
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Identifique-se para acessar a grade de torneios já convertida para o
            seu país e fuso horário.
          </p>
        </div>

        {handicaps.length === 0 ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Nenhum handicap ativo cadastrado. Peça a um administrador para
            configurar em /admin/handicaps.
          </p>
        ) : (
          <CheckinForm handicaps={handicaps} fusos={fusos} />
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          É da equipe?{" "}
          <Link href="/login" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
            Entrar no backoffice
          </Link>
        </p>
      </div>
    </main>
  );
}
