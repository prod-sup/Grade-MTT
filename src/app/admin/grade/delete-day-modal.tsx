"use client";

import { useState, useTransition } from "react";
import { deleteDayWithPassword } from "./actions";
import { BORDER_SUBTLE, SURFACE_ELEVATED_BG, TEXT_BODY, TEXT_PRIMARY, TEXT_SECONDARY } from "@/lib/ui/premium";

/**
 * Modal de confirmação de "Excluir Dia" — segunda camada de segurança (senha
 * master, além do RBAC de ADMIN já exigido pra abrir esta tela) para uma
 * operação destrutiva e irreversível (`deleteMany` na data exata).
 */
export function DeleteDayModal({
  dateISO,
  weekdayLabel,
  dateLabel,
  onClose,
  onDeleted,
}: {
  dateISO: string;
  weekdayLabel: string;
  dateLabel: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!password || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDayWithPassword(dateISO, password);
      if (!res.ok) {
        setError(res.error ?? "Falha ao excluir o dia.");
        return;
      }
      onDeleted();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-xl ${BORDER_SUBTLE} ${SURFACE_ELEVATED_BG}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={`text-lg font-semibold ${TEXT_PRIMARY}`}>
          Excluir {weekdayLabel} <span className="font-normal">({dateLabel})</span>
        </h2>

        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
          Esta ação apagará todos os torneios cadastrados neste dia e não pode ser desfeita.
        </p>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          <span className={`font-medium ${TEXT_BODY}`}>Senha master</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
            }}
            autoFocus
            disabled={pending}
            className={`rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-red-400/60 ${BORDER_SUBTLE} bg-white dark:bg-white/[0.03] ${TEXT_PRIMARY}`}
          />
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${BORDER_SUBTLE} ${TEXT_SECONDARY} hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-60`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending || !password}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
          >
            {pending ? "Excluindo…" : "Confirmar Exclusão"}
          </button>
        </div>
      </div>
    </div>
  );
}
