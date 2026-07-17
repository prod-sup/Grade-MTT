"use client";

import { useState } from "react";
import {
  FLYER_LAYOUT_LABELS,
  FLYER_LAYOUT_LIMITS,
  FLYER_LAYOUT_ORDER,
  type FlyerLayout,
  type FlyerTournament,
} from "@/lib/flyer/types";
import {
  BORDER_SUBTLE,
  GHOST_BUTTON,
  GOLD_BUTTON,
  ROW_HOVER,
  SURFACE_ELEVATED_BG,
  TEXT_BODY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "@/lib/ui/premium";

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
        className={`px-3 py-1.5 text-sm font-medium ${GHOST_BUTTON}`}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={close}
        >
          <div
            className={`max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg p-5 shadow-xl ${SURFACE_ELEVATED_BG}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${TEXT_PRIMARY}`}>Gerar Flyer</h2>
              <button
                onClick={close}
                className={`text-sm ${TEXT_SECONDARY} hover:text-gray-800 dark:hover:text-gray-200`}
              >
                Fechar ✕
              </button>
            </div>

            {!layout ? (
              <div className="flex flex-col gap-2">
                <p className={`text-sm ${TEXT_SECONDARY}`}>Escolha o layout do flyer:</p>
                {FLYER_LAYOUT_ORDER.map((key) => (
                  <button
                    key={key}
                    onClick={() => setLayout(key)}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${BORDER_SUBTLE} ${ROW_HOVER}`}
                  >
                    {FLYER_LAYOUT_LABELS[key]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm ${TEXT_BODY}`}>
                    {FLYER_LAYOUT_LABELS[layout]} — selecione{" "}
                    {limit === 1 ? "1 torneio" : `até ${limit} torneios`} {sourceHint}.
                  </p>
                  <button
                    onClick={() => {
                      setLayout(null);
                      setSelected(new Set());
                    }}
                    className={`shrink-0 text-xs ${TEXT_SECONDARY} hover:underline`}
                  >
                    Trocar layout
                  </button>
                </div>

                <div className={`flex flex-col gap-1 rounded-md border p-2 ${BORDER_SUBTLE}`}>
                  {available.length === 0 ? (
                    <p className={`px-2 py-4 text-center text-sm ${TEXT_SECONDARY}`}>
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
                            (disabled ? "opacity-40" : ROW_HOVER)
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
                          <span className={`truncate ${TEXT_BODY}`}>{t.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  disabled={selected.size === 0 || busy}
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${GOLD_BUTTON}`}
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
