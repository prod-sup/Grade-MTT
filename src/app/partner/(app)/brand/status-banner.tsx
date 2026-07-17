/** Banner de status da marca — usado no dashboard e em "Minha Marca". */
export function StatusBanner({
  status,
  reviewNote,
  hasBrand,
}: {
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  hasBrand: boolean;
}) {
  if (!hasBrand) {
    return (
      <p className="rounded-2xl border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-sm text-gray-400">
        Você ainda não enviou sua marca. Vá em <strong className="text-gray-200">Minha Marca</strong>{" "}
        para enviar sua logo, marca d&apos;água e telefone/ID do clube.
      </p>
    );
  }

  if (status === "APPROVED") {
    return (
      <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        Sua marca está <strong>aprovada</strong> — seus flyers já saem com sua logo, marca d&apos;água
        e telefone aplicados automaticamente.
      </p>
    );
  }

  if (status === "REJECTED") {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <p>
          Sua marca foi <strong>recusada</strong> pelo Marketing. Ajuste e reenvie em{" "}
          <strong>Minha Marca</strong>.
        </p>
        {reviewNote ? <p className="mt-1 text-red-200/80">Motivo: {reviewNote}</p> : null}
      </div>
    );
  }

  return (
    <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
      Sua marca está <strong>aguardando aprovação</strong> do Marketing. Enquanto isso, seus flyers
      saem sem a customização.
    </p>
  );
}
