import { requirePartner } from "@/lib/partner/dal";
import { GOLD_GRADIENT_TEXT } from "@/lib/ui/premium";
import { partnerLogout } from "../(guest)/actions";
import { PartnerNav } from "./partner-nav";

export default async function PartnerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await requirePartner();

  return (
    <div className="premium-atmosphere min-h-screen bg-[#0b0c0e] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0b0c0e]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
              Suprema Poker
            </p>
            <p className={`text-sm font-bold ${GOLD_GRADIENT_TEXT}`}>Portal de Parceiros</p>
            <p className="text-xs text-gray-500">{partner.clubName}</p>
          </div>

          <div className="flex items-center gap-3">
            <PartnerNav />
            <form action={partnerLogout}>
              <button
                type="submit"
                className="rounded-xl border border-white/[0.1] px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:border-white/[0.2] hover:text-white"
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
