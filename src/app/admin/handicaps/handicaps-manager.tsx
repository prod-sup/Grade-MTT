"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { saveHandicap, deleteHandicap, type ActionResult } from "./actions";

export interface HandicapRow {
  id: string;
  country: string;
  currencyLabel: string | null;
  multiplier: number;
  utcOffset: number;
  timezoneLabel: string;
  ianaTimezone: string | null;
  active: boolean;
  sortOrder: number;
}

const initialState: ActionResult = { ok: false };

export function HandicapsManager({
  handicaps,
  canEdit,
}: {
  handicaps: HandicapRow[];
  canEdit: boolean;
}) {
  // `null` = nenhum editor aberto; objeto vazio = criando; objeto = editando.
  const [editing, setEditing] = useState<HandicapRow | "new" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {canEdit && editing === null ? (
        <div>
          <button
            onClick={() => setEditing("new")}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + Novo handicap
          </button>
        </div>
      ) : null}

      {editing !== null ? (
        <HandicapForm
          key={editing === "new" ? "new" : editing.id}
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <Th>País</Th>
              <Th>Moeda</Th>
              <Th>Multiplicador</Th>
              <Th>Fuso (UTC)</Th>
              <Th>Rótulo</Th>
              <Th>IANA</Th>
              <Th>Ordem</Th>
              <Th>Ativo</Th>
              {canEdit ? <Th>Ações</Th> : null}
            </tr>
          </thead>
          <tbody>
            {handicaps.map((h) => (
              <tr
                key={h.id}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <Td className="font-medium">{h.country}</Td>
                <Td>{h.currencyLabel ?? "—"}</Td>
                <Td>×{h.multiplier}</Td>
                <Td>
                  {h.utcOffset >= 0 ? `+${h.utcOffset}` : h.utcOffset}
                </Td>
                <Td>{h.timezoneLabel}</Td>
                <Td>{h.ianaTimezone ?? "—"}</Td>
                <Td>{h.sortOrder}</Td>
                <Td>{h.active ? "Sim" : "Não"}</Td>
                {canEdit ? (
                  <Td>
                    <RowActions row={h} onEdit={() => setEditing(h)} />
                  </Td>
                ) : null}
              </tr>
            ))}
            {handicaps.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 9 : 8}
                  className="px-3 py-6 text-center text-zinc-500"
                >
                  Nenhum handicap cadastrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowActions({ row, onEdit }: { row: HandicapRow; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirm(`Excluir o handicap "${row.country}"?`)) return;
    startTransition(async () => {
      const res = await deleteHandicap(row.id);
      if (!res.ok) setError(res.error ?? "Falha ao excluir.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onEdit}
        className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Editar
      </button>
      <button
        onClick={onDelete}
        disabled={pending}
        className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? "…" : "Excluir"}
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

function HandicapForm({
  row,
  onClose,
}: {
  row: HandicapRow | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveHandicap, initialState);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
          {row ? `Editar: ${row.country}` : "Novo handicap"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Cancelar
        </button>
      </div>

      <input type="hidden" name="id" defaultValue={row?.id ?? ""} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="País *">
          <input name="country" required defaultValue={row?.country ?? ""} className={inputCls} />
        </Field>
        <Field label="Moeda (ISO)">
          <input name="currencyLabel" placeholder="BRL" defaultValue={row?.currencyLabel ?? ""} className={inputCls} />
        </Field>
        <Field label="Multiplicador cambial">
          <input name="multiplier" type="number" step="0.01" defaultValue={row?.multiplier ?? 1} className={inputCls} />
        </Field>
        <Field label="Offset UTC (horas)">
          <input name="utcOffset" type="number" step="0.5" defaultValue={row?.utcOffset ?? -3} className={inputCls} />
        </Field>
        <Field label="Rótulo do fuso">
          <input name="timezoneLabel" placeholder="GMT-3" defaultValue={row?.timezoneLabel ?? "GMT-3"} className={inputCls} />
        </Field>
        <Field label="Fuso IANA (opcional)">
          <input name="ianaTimezone" placeholder="America/Sao_Paulo" defaultValue={row?.ianaTimezone ?? ""} className={inputCls} />
        </Field>
        <Field label="Ordem de exibição">
          <input name="sortOrder" type="number" defaultValue={row?.sortOrder ?? 0} className={inputCls} />
        </Field>
        <Field label="Ativo">
          <label className="flex h-9 items-center gap-2">
            <input name="active" type="checkbox" defaultChecked={row?.active ?? true} className="h-4 w-4" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Visível na conversão</span>
          </label>
        </Field>
      </div>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
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
