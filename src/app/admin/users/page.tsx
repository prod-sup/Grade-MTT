import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/dal";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function UsersPage() {
  await requireUser(); // Admin e Operacional podem consultar.

  const logs = await prisma.accessLog.findMany({
    orderBy: { lastSeen: "desc" },
    include: { handicap: true },
    take: 500,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Check-ins do Portal
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Visitantes que se identificaram na landing pública ({logs.length}).
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <Th>Nome</Th>
              <Th>E-mail</Th>
              <Th>Clube</Th>
              <Th>País (handicap)</Th>
              <Th>Fuso</Th>
              <Th>Último acesso</Th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <Td className="font-medium">{l.name}</Td>
                <Td>{l.email}</Td>
                <Td>{l.club ?? "—"}</Td>
                <Td>{l.handicap?.country ?? "—"}</Td>
                <Td>{l.timezoneLabel ?? "—"}</Td>
                <Td className="whitespace-nowrap">{dateFmt.format(l.lastSeen)}</Td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  Nenhum check-in ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-zinc-800 dark:text-zinc-200 ${className}`}>{children}</td>;
}
