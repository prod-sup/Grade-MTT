"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateContext } from "./actions";
import type { HandicapOption, FusoOption } from "@/lib/portal/context-options";

/**
 * Seletor de contexto do header. Handicap (moeda) e fuso (horário) são
 * INDEPENDENTES: trocar um não altera o outro.
 */
export function ContextSelector({
  handicaps,
  fusos,
  currentHandicapId,
  currentFuso,
}: {
  handicaps: HandicapOption[];
  fusos: FusoOption[];
  currentHandicapId: string;
  currentFuso: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [handicapId, setHandicapId] = useState(currentHandicapId);
  const [fuso, setFuso] = useState(currentFuso);

  function apply(nextHandicap: string, nextFuso: string) {
    startTransition(async () => {
      await updateContext(nextHandicap, nextFuso);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">Moeda</span>
        <select
          value={handicapId}
          disabled={pending}
          onChange={(e) => {
            setHandicapId(e.target.value);
            apply(e.target.value, fuso);
          }}
          className={selectCls}
        >
          {handicaps.map((h) => (
            <option key={h.id} value={h.id}>
              {h.country}
              {h.currencyLabel ? ` (${h.currencyLabel})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1 text-sm">
        <span className="text-zinc-500 dark:text-zinc-400">Fuso</span>
        <select
          value={fuso}
          disabled={pending}
          onChange={(e) => {
            setFuso(e.target.value);
            apply(handicapId, e.target.value);
          }}
          className={selectCls}
        >
          {fusos.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const selectCls =
  "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
