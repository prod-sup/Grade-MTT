"use client";

import { useActionState, useMemo, useState } from "react";
import { checkin, type CheckinState } from "./portal/actions";
import type { HandicapOption, FusoOption } from "@/lib/portal/context-options";
import { GOLD_BUTTON } from "@/lib/ui/premium";

const initialState: CheckinState = {};

export function CheckinForm({
  handicaps,
  fusos,
}: {
  handicaps: HandicapOption[];
  fusos: FusoOption[];
}) {
  const [state, formAction, pending] = useActionState(checkin, initialState);

  const [handicapId, setHandicapId] = useState(handicaps[0]?.id ?? "");
  const fusoByHandicap = useMemo(
    () => new Map(handicaps.map((h) => [h.id, h.fusoValue])),
    [handicaps],
  );
  const [fuso, setFuso] = useState(handicaps[0]?.fusoValue ?? fusos[0]?.value ?? "");

  function onHandicapChange(id: string) {
    setHandicapId(id);
    // Sincroniza o fuso com o país escolhido (o usuário ainda pode trocar).
    const f = fusoByHandicap.get(id);
    if (f) setFuso(f);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">Nome</span>
        <input name="name" required autoFocus className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">E-mail</span>
        <input type="email" name="email" required className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">Clube</span>
        <input name="club" placeholder="Opcional" className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">WhatsApp</span>
        <input
          type="tel"
          name="phone"
          placeholder="Opcional — para avisos de torneios"
          autoComplete="tel"
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">País (moeda)</span>
        <select
          name="handicapId"
          value={handicapId}
          onChange={(e) => onHandicapChange(e.target.value)}
          className={inputCls}
        >
          {handicaps.map((h) => (
            <option key={h.id} value={h.id} className="bg-[#121316] text-white">
              {h.country}
              {h.currencyLabel ? ` (${h.currencyLabel})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">Fuso horário</span>
        <select
          name="fuso"
          value={fuso}
          onChange={(e) => setFuso(e.target.value)}
          className={inputCls}
        >
          {fusos.map((f) => (
            <option key={f.value} value={f.value} className="bg-[#121316] text-white">
              {f.label}
            </option>
          ))}
        </select>
      </label>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`mt-2 px-4 py-2.5 disabled:opacity-60 ${GOLD_BUTTON}`}>
        {pending ? "Entrando…" : "Acessar a grade"}
      </button>
    </form>
  );
}

const inputCls =
  "rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#d4af37]/50 focus:bg-white/[0.06]";
