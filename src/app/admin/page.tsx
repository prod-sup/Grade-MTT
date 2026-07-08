import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, isAdmin } from "@/lib/auth/dal";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const user = await requireUser();
  const { erro } = await searchParams;

  const [tournaments, visible, handicaps] = await Promise.all([
    prisma.tournament.count(),
    prisma.tournament.count({ where: { visible: true } }),
    prisma.handicap.count(),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Painel
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Bem-vindo, {user.name}.
      </p>

      {erro === "somente-admin" ? (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Essa área é exclusiva de administradores. Seu perfil (Operacional) tem
          acesso somente de leitura.
        </p>
      ) : null}

      {!isAdmin(user) ? (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Você está no modo <strong>Operacional (somente leitura)</strong>. Pode
          consultar toda a grade e os cálculos, mas as edições estão bloqueadas.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Torneios" value={tournaments} />
        <Stat label="Visíveis no portal" value={visible} />
        <Stat label="Handicaps" value={handicaps} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/grade"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Abrir grade de torneios
        </Link>
        <Link
          href="/admin/handicaps"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Gerir handicaps
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
}
