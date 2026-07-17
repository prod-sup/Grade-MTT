import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getVisitor } from "@/lib/portal/session";
import { buildContextOptions } from "@/lib/portal/context-options";
import {
  GOLD_GRADIENT_TEXT,
  GLASS_CARD,
  GLOW_GOLD_STATIC,
  SURFACE_BG,
  TEXT_MUTED,
  TEXT_SECONDARY,
  TEXT_BODY,
} from "@/lib/ui/premium";
import { CheckinForm } from "./checkin-form";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <main className={`premium-atmosphere flex min-h-screen items-center justify-center px-4 py-10 ${SURFACE_BG}`}>
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${TEXT_MUTED}`}>
            Suprema Poker
          </p>
          <h1 className={`mt-2 text-3xl font-bold ${GOLD_GRADIENT_TEXT}`}>Grade MTT</h1>
          <p className={`mt-3 text-sm ${TEXT_SECONDARY}`}>
            Identifique-se para acessar a grade de torneios já convertida para o
            seu país e fuso horário.
          </p>
        </div>

        <div className={`${GLASS_CARD} ${GLOW_GOLD_STATIC} p-8`}>
          {handicaps.length === 0 ? (
            <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              Nenhum handicap ativo cadastrado. Peça a um administrador para
              configurar em /admin/handicaps.
            </p>
          ) : (
            <CheckinForm handicaps={handicaps} fusos={fusos} />
          )}
        </div>

        <p className={`mt-6 text-center text-xs ${TEXT_MUTED}`}>
          É da equipe?{" "}
          <Link href="/login" className={`underline ${TEXT_BODY} hover:text-gray-900 dark:hover:text-white`}>
            Entrar no backoffice
          </Link>
        </p>
      </div>
    </main>
  );
}
