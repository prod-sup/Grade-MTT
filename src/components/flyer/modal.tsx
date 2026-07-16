"use client";

import { useState } from "react";
import {
  FLYER_LAYOUT_LABELS,
  FLYER_LAYOUT_LIMITS,
  FLYER_LAYOUT_ORDER,
  type FlyerLayout,
  type FlyerTournament,
} from "@/lib/flyer/types";

export function FlyerModal({
  available,
  busy,
  onGenerate,
  triggerLabel = "Gerar Flyer",
  actionLabel = "Baixar imagem",
  sourceHint = "da grade do dia",
}: {
  /** Torneios disponíveis para compor o flyer — fonte das checkboxes. */
  available: FlyerTournament[];
  busy: boolean;
  onGenerate: (layout: FlyerLayout, items: FlyerTournament[]) => void;
  /** Rótulo do botão que abre o modal. */
  triggerLabel?: string;
  /** Rótulo do botão final de confirmação (baixar vs. salvar, por exemplo). */
  actionLabel?: string;
  /** Frase usada para descrever a origem dos torneios selecionáveis. */
  sourceHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<FlyerLayout | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const limit = layout ? FLYER_LAYOUT_LIMITS[layout] : 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= limit) return prev; // respeita o limite do layout
        next.add(id);
      }
      return next;
    });
  }

  function reset() {
    setLayout(null);
    setSelected(new Set());
  }

  function close() {
    setOpen(false);
    reset();
  }

  function handleConfirm() {
    if (!layout) return;
    const items = available.filter((t) => selected.has(t.id));
    if (items.length === 0) return;
    onGenerate(layout, items);
    close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-amber-400 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-950/40"
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Gerar Flyer</h2>
              <button
                onClick={close}
                className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Fechar ✕
              </button>
            </div>

            {!layout ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Escolha o layout do flyer:</p>
                {FLYER_LAYOUT_ORDER.map((key) => (
                  <button
                    key={key}
                    onClick={() => setLayout(key)}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    {FLYER_LAYOUT_LABELS[key]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {FLYER_LAYOUT_LABELS[layout]} — selecione{" "}
                    {limit === 1 ? "1 torneio" : `até ${limit} torneios`} {sourceHint}.
                  </p>
                  <button
                    onClick={() => {
                      setLayout(null);
                      setSelected(new Set());
                    }}
                    className="shrink-0 text-xs text-zinc-500 hover:underline"
                  >
                    Trocar layout
                  </button>
                </div>

                <div className="flex flex-col gap-1 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
                  {available.length === 0 ? (
                    <p className="px-2 py-4 text-center text-sm text-zinc-500">
                      Nenhum torneio disponível.
                    </p>
                  ) : (
                    available.map((t) => {
                      const checked = selected.has(t.id);
                      const disabled = !checked && selected.size >= limit;
                      return (
                        <label
                          key={t.id}
                          className={
                            "flex items-center gap-2 rounded px-2 py-1.5 text-sm " +
                            (disabled ? "opacity-40" : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(t.id)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium">{t.startTime}</span>
                          <span className="truncate text-zinc-700 dark:text-zinc-300">{t.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  disabled={selected.size === 0 || busy}
                  onClick={handleConfirm}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {busy ? "Gerando…" : `${actionLabel} (${selected.size}/${limit})`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
