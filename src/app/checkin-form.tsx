"use client";

import { useActionState, useMemo, useState } from "react";
import { checkin, type CheckinState } from "./portal/actions";
import type { HandicapOption, FusoOption } from "@/lib/portal/context-options";

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
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Nome</span>
        <input name="name" required autoFocus className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">E-mail</span>
        <input type="email" name="email" required className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Clube</span>
        <input name="club" placeholder="Opcional" className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          País (moeda)
        </span>
        <select
          name="handicapId"
          value={handicapId}
          onChange={(e) => onHandicapChange(e.target.value)}
          className={inputCls}
        >
          {handicaps.map((h) => (
            <option key={h.id} value={h.id}>
              {h.country}
              {h.currencyLabel ? ` (${h.currencyLabel})` : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Fuso horário
        </span>
        <select
          name="fuso"
          value={fuso}
          onChange={(e) => setFuso(e.target.value)}
          className={inputCls}
        >
          {fusos.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Entrando…" : "Acessar a grade"}
      </button>
    </form>
  );
}

const inputCls =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
