import { GOLD_GRADIENT_TEXT } from "@/lib/ui/premium";

/** Chrome comum das telas não-autenticadas do Parceiro (signup/login/reset). */
export default function PartnerGuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="premium-atmosphere flex min-h-screen items-center justify-center bg-[#0b0c0e] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            Suprema Poker
          </p>
          <h1 className={`mt-2 text-3xl font-bold ${GOLD_GRADIENT_TEXT}`}>Portal de Parceiros</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
