import { prisma } from "@/lib/prisma";
import { requireUser, isAdmin } from "@/lib/auth/dal";
import { GradeTable, type TournamentRow } from "./grade-table";

export default async function GradePage() {
  const user = await requireUser();
  const canEdit = isAdmin(user);

  const rows = await prisma.tournament.findMany({
    orderBy: [{ dayOrder: "asc" }, { startTime: "asc" }],
  });

  // Remove campos Date e mantém apenas os escalares editáveis/exibíveis.
  const tournaments: TournamentRow[] = rows.map((t) => {
    const rest: Record<string, unknown> = { ...t };
    delete rest.createdAt;
    delete rest.updatedAt;
    return rest as TournamentRow;
  });

  return (
    <div className="mx-auto max-w-full">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Grade de Torneios
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Base: USD e GMT-3. Edição inline nas colunas principais; use ⋯ para os
        demais campos.
      </p>

      {!canEdit ? (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Modo somente leitura (Operacional). Você vê todos os dados e cálculos,
          mas não pode editar.
        </p>
      ) : null}

      <div className="mt-6">
        <GradeTable tournaments={tournaments} canEdit={canEdit} />
      </div>
    </div>
  );
}
