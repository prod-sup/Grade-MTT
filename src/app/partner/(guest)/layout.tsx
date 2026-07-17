import { GOLD_GRADIENT_TEXT, SURFACE_BG, TEXT_MUTED } from "@/lib/ui/premium";
import { ThemeToggle } from "@/components/theme-toggle";

/** Chrome comum das telas não-autenticadas do Parceiro (signup/login/reset). */
export default function PartnerGuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={`premium-atmosphere flex min-h-screen items-center justify-center px-4 py-10 ${SURFACE_BG}`}>
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${TEXT_MUTED}`}>
            Suprema Poker
          </p>
          <h1 className={`mt-2 text-3xl font-bold ${GOLD_GRADIENT_TEXT}`}>Portal de Parceiros</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
