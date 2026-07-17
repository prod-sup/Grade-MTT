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
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-xs uppercase tracking-wide text-gray-500">Moeda</span>
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
            <option key={h.id} value={h.id} className="bg-[#121316] text-gray-100">
              {h.country}
              {h.currencyLabel ? ` (${h.currencyLabel})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-xs uppercase tracking-wide text-gray-500">Fuso</span>
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
            <option key={f.value} value={f.value} className="bg-[#121316] text-gray-100">
              {f.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const selectCls =
  "rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 py-1.5 text-sm text-gray-200 outline-none transition-colors focus:border-[#d4af37]/50 disabled:opacity-60";
