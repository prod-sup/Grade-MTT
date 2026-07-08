import { prisma } from "@/lib/prisma";
import { requireUser, isAdmin } from "@/lib/auth/dal";
import { HandicapsManager, type HandicapRow } from "./handicaps-manager";

export default async function HandicapsPage() {
  const user = await requireUser();
  const canEdit = isAdmin(user);

  const rows = await prisma.handicap.findMany({
    orderBy: [{ sortOrder: "asc" }, { country: "asc" }],
  });

  const handicaps: HandicapRow[] = rows.map((h) => ({
    id: h.id,
    country: h.country,
    currencyLabel: h.currencyLabel,
    multiplier: h.multiplier,
    utcOffset: h.utcOffset,
    timezoneLabel: h.timezoneLabel,
    ianaTimezone: h.ianaTimezone,
    active: h.active,
    sortOrder: h.sortOrder,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Handicaps
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Regras de conversão por país (multiplicador cambial + fuso horário). Base
        de armazenamento: USD e GMT-3.
      </p>

      {!canEdit ? (
        <p className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Modo somente leitura (Operacional).
        </p>
      ) : null}

      <div className="mt-6">
        <HandicapsManager handicaps={handicaps} canEdit={canEdit} />
      </div>
    </div>
  );
}
