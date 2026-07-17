import { requirePartner } from "@/lib/partner/dal";
import { BORDER_SUBTLE, GOLD_GRADIENT_TEXT, SURFACE_BG, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from "@/lib/ui/premium";
import { partnerLogout } from "../(guest)/actions";
import { PartnerNav } from "./partner-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function PartnerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await requirePartner();

  return (
    <div className={`premium-atmosphere min-h-screen ${SURFACE_BG} ${TEXT_PRIMARY}`}>
      <header
        className={`sticky top-0 z-40 border-b ${BORDER_SUBTLE} bg-gray-50/85 dark:bg-[#0b0c0e]/85 backdrop-blur-md`}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${TEXT_MUTED}`}>
              Suprema Poker
            </p>
            <p className={`text-sm font-bold ${GOLD_GRADIENT_TEXT}`}>Portal de Parceiros</p>
            <p className={`text-xs ${TEXT_MUTED}`}>{partner.clubName}</p>
          </div>

          <div className="flex items-center gap-3">
            <PartnerNav />
            <ThemeToggle />
            <form action={partnerLogout}>
              <button
                type="submit"
                className={`rounded-xl border border-gray-300 dark:border-white/[0.1] px-3 py-1.5 text-sm font-medium ${TEXT_SECONDARY} transition-colors hover:border-gray-400 dark:hover:border-white/[0.2] hover:text-gray-900 dark:hover:text-white`}
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
