import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/app/(auth)/actions";
import { AdminNav } from "./_components/admin-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SURFACE_BG,
  SURFACE_ELEVATED_BG,
  TEXT_PRIMARY,
  TEXT_BODY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  BORDER_SUBTLE,
} from "@/lib/ui/premium";

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "ADMIN",
  MARKETING: "MARKETING",
  OPERACIONAL: "OPERACIONAL (somente leitura)",
};

const ROLE_BADGE_CLS: Record<string, string> = {
  ADMIN: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  MARKETING: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20",
  OPERACIONAL: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
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
    <div className={`flex min-h-screen ${SURFACE_BG} ${TEXT_PRIMARY}`}>
      {/* Sidebar */}
      <aside className={`flex w-60 flex-col justify-between border-r ${BORDER_SUBTLE} ${SURFACE_ELEVATED_BG} p-4`}>
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${TEXT_MUTED}`}>
                Grade MTT
              </p>
              <p className={`text-sm font-semibold ${TEXT_PRIMARY}`}>Backoffice</p>
            </div>
            <ThemeToggle />
          </div>
          <AdminNav role={user.role} />
        </div>

        <div className={`flex flex-col gap-3 border-t ${BORDER_SUBTLE} pt-4`}>
          <div className="text-sm">
            <p className={`truncate font-medium ${TEXT_BODY}`}>{user.name}</p>
            <p className={`truncate text-xs ${TEXT_MUTED}`}>{user.email}</p>
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
              className={`w-full rounded-lg border border-gray-300 dark:border-white/[0.1] px-3 py-2 text-sm font-medium ${TEXT_SECONDARY} transition-colors hover:border-gray-400 dark:hover:border-white/[0.2] hover:text-gray-900 dark:hover:text-white`}
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className={`flex-1 overflow-x-auto ${SURFACE_BG} p-6`}>{children}</main>
    </div>
  );
}
