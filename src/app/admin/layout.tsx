import { requireUser, isAdmin } from "@/lib/auth/dal";
import { logout } from "@/app/(auth)/actions";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate inicial. As páginas e Server Actions re-checam por conta própria
  // (layouts não re-renderizam a cada navegação no Next 16).
  const user = await requireUser();
  const admin = isAdmin(user);

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-black">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col justify-between border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Grade MTT
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Backoffice
            </p>
          </div>
          <AdminNav />
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="text-sm">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              {user.name}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
            <span
              className={
                "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
                (admin
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300")
              }
            >
              {admin ? "ADMIN" : "OPERACIONAL (somente leitura)"}
            </span>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}
