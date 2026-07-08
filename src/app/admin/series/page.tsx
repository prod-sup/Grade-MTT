import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { UploadForm } from "./upload-form";
import { SeriesReview, type ReviewRow } from "./review";
import { discardImport } from "./actions";

function fmtDate(d: Date): string {
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string }>;
}) {
  // Upload/aplicação de séries é ESCRITA → somente ADMIN.
  await requireAdmin();
  const { import: importId } = await searchParams;

  // Modo revisão: um import selecionado.
  if (importId) {
    const imp = await prisma.seriesImport.findUnique({
      where: { id: importId },
      include: { rows: { orderBy: { rowIndex: "asc" } } },
    });
    if (!imp) {
      return (
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">Série não encontrada</h1>
          <Link href="/admin/series" className="mt-2 inline-block text-sm text-emerald-700 dark:text-emerald-400">
            ← Voltar
          </Link>
        </div>
      );
    }

    // Busca os bases referenciados (para exibir "o que será substituído").
    const baseIds = [...new Set(imp.rows.map((r) => r.matchBaseId).filter(Boolean) as string[])];
    const bases = baseIds.length
      ? await prisma.tournament.findMany({
          where: { id: { in: baseIds } },
          select: { id: true, shortName: true, name: true, gtd: true },
        })
      : [];
    const baseMap = new Map(bases.map((b) => [b.id, b]));

    const reviewRows: ReviewRow[] = imp.rows.map((r) => {
      const base = r.matchBaseId ? baseMap.get(r.matchBaseId) : null;
      return {
        id: r.id,
        rowIndex: r.rowIndex,
        date: fmtDate(r.eventDate),
        startTime: r.startTime,
        shortName: r.shortName,
        name: r.name,
        gtd: r.gtd,
        status: r.status as ReviewRow["status"],
        reviewNote: r.reviewNote,
        resolved: r.resolved,
        base: base ? { shortName: base.shortName, name: base.name, gtd: base.gtd } : null,
      };
    });

    const discard = discardImport.bind(null, imp.id);

    return (
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Revisão da série · {imp.seriesName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {imp.filename ?? "arquivo"} · {imp.rows.length} linhas. Confirme linha a
              linha — verde substitui o base, vermelho cria novo, amarelo você decide.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/series" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Nova série
            </Link>
            <form action={discard}>
              <button className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40">
                Descartar import
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6">
          <SeriesReview rows={reviewRows} />
        </div>
      </div>
    );
  }

  // Modo upload: formulário + imports recentes.
  const recent = await prisma.seriesImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { rows: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Upload de Séries
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Baixe a semana pelo export <strong>Horizontal</strong>, marque os torneios
        da série (prefixo/GTD) e suba aqui. O sistema classifica cada linha e você
        confirma o que substitui, o que é novo e o que fica igual.
      </p>

      <div className="mt-6">
        <UploadForm />
      </div>

      {recent.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Imports recentes</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {recent.map((imp) => (
              <li key={imp.id}>
                <Link
                  href={`/admin/series?import=${imp.id}`}
                  className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  {imp.seriesName} — {imp._count.rows} linhas ({imp.filename ?? "arquivo"})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
