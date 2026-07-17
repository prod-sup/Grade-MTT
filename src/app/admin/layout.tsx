import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/app/(auth)/actions";
import { AdminNav } from "./_components/admin-nav";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "ADMIN",
  MARKETING: "MARKETING",
  OPERACIONAL: "OPERACIONAL (somente leitura)",
};

const ROLE_BADGE_CLS: Record<string, string> = {
  ADMIN: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  MARKETING: "bg-violet-500/10 text-violet-300 border border-violet-500/20",
  OPERACIONAL: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate inicial. As páginas e Server Actions re-checam por conta própria
  // (layouts não re-renderizam a cada navegação no Next 16).
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-[#0b0c0e] text-white">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col justify-between border-r border-white/[0.08] bg-[#121316] p-4">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Grade MTT
            </p>
            <p className="text-sm font-semibold text-white">Backoffice</p>
          </div>
          <AdminNav role={user.role} />
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-4">
          <div className="text-sm">
            <p className="truncate font-medium text-gray-200">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            <span
              className={
                "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
                (ROLE_BADGE_CLS[user.role] ?? ROLE_BADGE_CLS.OPERACIONAL)
              }
            >
              {ROLE_BADGE[user.role] ?? user.role}
            </span>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-lg border border-white/[0.1] px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-white/[0.2] hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-x-auto bg-[#0b0c0e] p-6">{children}</main>
    </div>
  );
}
