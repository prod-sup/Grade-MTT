"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { confirmRow, createAsNew, skipRow } from "./actions";

export interface ReviewRow {
  id: string;
  rowIndex: number;
  date: string; // dd/mm/yyyy
  startTime: string;
  shortName: string | null;
  name: string;
  gtd: number | null;
  status: "GREEN" | "YELLOW" | "RED" | "SAME";
  reviewNote: string | null;
  resolved: boolean;
  base: { shortName: string | null; name: string; gtd: number | null } | null;
}

const STATUS_META: Record<
  ReviewRow["status"],
  { label: string; chip: string; card: string }
> = {
  GREEN: {
    label: "Substitui base",
    chip: "bg-emerald-500",
    card: "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40",
  },
  YELLOW: {
    label: "Dúvida",
    chip: "bg-amber-500",
    card: "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40",
  },
  RED: {
    label: "Novo (inédito)",
    chip: "bg-red-500",
    card: "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40",
  },
  SAME: {
    label: "Idêntico (sem ação)",
    chip: "bg-zinc-400",
    card: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
  },
};

function money(v: number | null): string {
  return v == null ? "—" : `$${v.toLocaleString("pt-BR")}`;
}

export function SeriesReview({ rows: initialRows }: { rows: ReviewRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(initialRows);
  const [current, setCurrent] = useState(() => {
    const i = initialRows.findIndex((r) => !r.resolved);
    return i === -1 ? 0 : i;
  });
  const [msg, setMsg] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { GREEN: 0, YELLOW: 0, RED: 0, SAME: 0, resolved: 0 };
    for (const r of rows) {
      c[r.status]++;
      if (r.resolved) c.resolved++;
    }
    return c;
  }, [rows]);

  function markResolvedLocally(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, resolved: true } : r)));
  }
  function advance(fromIndex: number) {
    const next = rows.findIndex((r, i) => i > fromIndex && !r.resolved);
    if (next !== -1) setCurrent(next);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, id: string, idx: number) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        markResolvedLocally(id);
        advance(idx);
        router.refresh();
      } else {
        setMsg(res.error ?? "Falha na ação.");
      }
    });
  }

  const row = rows[current];
  const total = rows.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">
          {counts.resolved}/{total} resolvidas
        </span>
        <Legend color="bg-emerald-500" label={`${counts.GREEN} substituem`} />
        <Legend color="bg-amber-500" label={`${counts.YELLOW} em dúvida`} />
        <Legend color="bg-red-500" label={`${counts.RED} novos`} />
        <Legend color="bg-zinc-400" label={`${counts.SAME} idênticos`} />
      </div>

      {/* Tira de navegação (chips por linha) */}
      <div className="flex flex-wrap gap-1">
        {rows.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setCurrent(i)}
            title={`${r.date} ${r.startTime} ${r.shortName ?? r.name}`}
            className={
              "h-3 w-3 rounded-sm transition-transform " +
              STATUS_META[r.status].chip +
              (r.resolved ? " opacity-30" : "") +
              (i === current ? " ring-2 ring-offset-1 ring-zinc-900 dark:ring-zinc-100" : "")
            }
          />
        ))}
      </div>

      {/* Linha atual */}
      {row ? (
        <div className={"rounded-lg border p-4 " + STATUS_META[row.status].card}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {STATUS_META[row.status].label} · linha {row.rowIndex + 1} de {total}
            </span>
            {row.resolved ? (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ resolvida</span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {/* Torneio da série */}
            <div className="rounded-md bg-white/70 p-3 text-sm dark:bg-zinc-900/60">
              <p className="text-xs font-semibold text-zinc-500">TORNEIO DA SÉRIE</p>
              <p className="mt-1 font-medium">{row.shortName ?? row.name}</p>
              <p className="text-zinc-600 dark:text-zinc-400">
                {row.date} · {row.startTime} · GTD {money(row.gtd)}
              </p>
            </div>
            {/* Base a substituir */}
            <div className="rounded-md bg-white/70 p-3 text-sm dark:bg-zinc-900/60">
              <p className="text-xs font-semibold text-zinc-500">
                {row.base ? "BASE A SUBSTITUIR (será excluído)" : "SEM BASE"}
              </p>
              {row.base ? (
                <>
                  <p className="mt-1 font-medium line-through decoration-red-500/70">
                    {row.base.shortName ?? row.base.name}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">GTD {money(row.base.gtd)}</p>
                </>
              ) : (
                <p className="mt-1 text-zinc-500">Será criado como novo torneio.</p>
              )}
            </div>
          </div>

          {row.reviewNote ? (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{row.reviewNote}</p>
          ) : null}

          {/* Ações */}
          {!row.resolved ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {row.status === "GREEN" ? (
                <ActionBtn primary disabled={pending} onClick={() => run(() => confirmRow(row.id), row.id, current)}>
                  Confirmar — substituir base
                </ActionBtn>
              ) : null}
              {row.status === "YELLOW" ? (
                <>
                  <ActionBtn primary disabled={pending} onClick={() => run(() => confirmRow(row.id), row.id, current)}>
                    Substituir o base indicado
                  </ActionBtn>
                  <ActionBtn disabled={pending} onClick={() => run(() => createAsNew(row.id), row.id, current)}>
                    Criar como novo
                  </ActionBtn>
                </>
              ) : null}
              {row.status === "RED" ? (
                <ActionBtn primary disabled={pending} onClick={() => run(() => createAsNew(row.id), row.id, current)}>
                  Criar novo torneio
                </ActionBtn>
              ) : null}
              {row.status === "SAME" ? (
                <ActionBtn primary disabled={pending} onClick={() => run(() => skipRow(row.id), row.id, current)}>
                  Ok (sem ação)
                </ActionBtn>
              ) : null}
              <ActionBtn disabled={pending} onClick={() => run(() => skipRow(row.id), row.id, current)}>
                Pular
              </ActionBtn>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <ActionBtn disabled={pending || current === 0} onClick={() => setCurrent((c) => Math.max(0, c - 1))}>
                ‹ Anterior
              </ActionBtn>
              <ActionBtn disabled={pending || current >= total - 1} onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}>
                Próxima ›
              </ActionBtn>
            </div>
          )}

          {msg ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{msg}</p> : null}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Sem linhas para revisar.</p>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
      <span className={"h-3 w-3 rounded-sm " + color} /> {label}
    </span>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (primary
          ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800")
      }
    >
      {children}
    </button>
  );
}
