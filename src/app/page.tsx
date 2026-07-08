import Link from "next/link";

// Placeholder temporário. Na Fase 4 esta rota "/" vira a landing pública
// (check-in / seleção de país-handicap) descrita na seção 7 do projeto.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-black">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          Grade MTT — Suprema
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Plataforma de gestão da grade de torneios.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Entrar no backoffice
      </Link>
    </main>
  );
}
