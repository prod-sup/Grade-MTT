"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { TournamentModel } from "@/generated/prisma/models";
import { computeField, WEEKDAYS, ptWeekday } from "@/lib/conversion";
import {
  copyDay,
  copyWeek,
  createTournament,
  deleteTournament,
  duplicateTournament,
  updateTournament,
} from "./actions";
import { TOURNAMENT_FIELDS, HOT_FIELDS, selectDisplayValue, type FieldMeta } from "./fields";

// Ordem de exibição por tipo (Main Event → Side Event → Sat), depois horário.
const TYPE_RANK: Record<string, number> = { "Main Event": 0, "Side Event": 1, "Sat": 2 };

// eventDate (Date) é excluído: não é célula editável desta tabela e não cabe no
// tipo CellValue (string|number|boolean|null). É tratado nas telas de mês/arquivo.
export type TournamentRow = Omit<
  TournamentModel,
  "createdAt" | "updatedAt" | "eventDate"
>;

export function GradeTable({
  tournaments,
  canEdit,
  weekStartISO,
  sourceByDay,
  initialDay,
}: {
  tournaments: TournamentRow[];
  canEdit: boolean;
  /** Segunda-feira (YYYY-MM-DD, UTC) da semana exibida — p/ rotular a data de cada dia. */
  weekStartISO?: string;
  /** Por dia da semana (EN): data-fonte a copiar (dia anterior mais recente) ou null. */
  sourceByDay?: Record<string, string | null>;
  /** Dia (EN) a focar inicialmente (ex.: 1º dia do mês ao "criar mês seguinte"). */
  initialDay?: string;
}) {
  const router = useRouter();
  const [copying, startCopy] = useTransition();
  const [copyMsg, setCopyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tournaments) map.set(t.dayOfWeek, (map.get(t.dayOfWeek) ?? 0) + 1);
    return map;
  }, [tournaments]);

  // Data concreta (DD/MM) de cada dia da semana exibida.
  const dateByWeekday = useMemo(() => {
    const map = new Map<string, string>();
    if (!weekStartISO) return map;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartISO);
    if (!m) return map;
    const start = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    for (const w of WEEKDAYS) {
      const d = new Date(start.getTime() + (w.order - 1) * 86_400_000);
      map.set(
        w.en,
        `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      );
    }
    return map;
  }, [weekStartISO]);

  const firstDay = WEEKDAYS.find((w) => (counts.get(w.en) ?? 0) > 0)?.en ?? "MONDAY";
  const [day, setDay] = useState<string>(
    initialDay && WEEKDAYS.some((w) => w.en === initialDay) ? initialDay : firstDay,
  );
  const [detail, setDetail] = useState<TournamentRow | null>(null);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const filtered = tournaments.filter((t) => t.dayOfWeek === day);
    return [...filtered].sort((a, b) => {
      const ra = TYPE_RANK[a.type] ?? 99;
      const rb = TYPE_RANK[b.type] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
  }, [tournaments, day]);

  // Reabre o drawer no torneio recém-criado assim que os dados são atualizados
  // (derivado no render — evita setState dentro de um efeito).
  const pendingRow = pendingOpenId ? tournaments.find((t) => t.id === pendingOpenId) ?? null : null;
  const activeDetail = pendingRow ?? detail;
  function closeDetail() {
    setDetail(null);
    setPendingOpenId(null);
  }

  // ISO (YYYY-MM-DD) do dia selecionado e do próximo dia — para copiar/avançar.
  const weekStart = useMemo(() => {
    const m = weekStartISO ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartISO) : null;
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }, [weekStartISO]);

  const dayOrder = WEEKDAYS.find((w) => w.en === day)?.order ?? 1;
  const selectedISO = weekStart
    ? new Date(weekStart.getTime() + (dayOrder - 1) * 86_400_000).toISOString().slice(0, 10)
    : null;
  const nextDayEn = WEEKDAYS.find((w) => w.order === dayOrder + 1)?.en ?? null;
  const source = sourceByDay?.[day] ?? null;
  const dayEmpty = (counts.get(day) ?? 0) === 0;

  function fmtISO(iso: string): string {
    const [y, mo, d] = iso.split("-");
    return `${d}/${mo}/${y}`;
  }

  function runCopyDay() {
    if (!selectedISO) return;
    setCopyMsg(null);
    startCopy(async () => {
      const res = await copyDay(selectedISO);
      if (res.ok) {
        setCopyMsg({ ok: true, text: `Copiado de ${res.sourceISO ? fmtISO(res.sourceISO) : ""} — ${res.created} torneios.` });
        if (nextDayEn) setDay(nextDayEn); // avança para o próximo dia
        router.refresh();
      } else {
        setCopyMsg({ ok: false, text: res.error ?? "Falha ao copiar o dia." });
      }
    });
  }

  function runCreate() {
    if (!selectedISO) return;
    setCopyMsg(null);
    startCopy(async () => {
      const res = await createTournament(selectedISO);
      if (res.ok && res.id) {
        setPendingOpenId(res.id);
        router.refresh();
      } else {
        setCopyMsg({ ok: false, text: res.error ?? "Falha ao criar torneio." });
      }
    });
  }

  function runCopyWeek() {
    if (!weekStartISO) return;
    setCopyMsg(null);
    startCopy(async () => {
      const res = await copyWeek(weekStartISO);
      if (res.ok) {
        setCopyMsg({ ok: true, text: `Semana preenchida: ${res.days} dias, ${res.created} torneios.` });
        router.refresh();
      } else {
        setCopyMsg({ ok: false, text: res.error ?? "Falha ao copiar a semana." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtro por dia da semana */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
        {WEEKDAYS.map((w) => {
          const n = counts.get(w.en) ?? 0;
          const active = w.en === day;
          return (
            <button
              key={w.en}
              onClick={() => setDay(w.en)}
              className={
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-white/[0.08] text-white"
                  : "border border-white/[0.08] bg-white/[0.02] text-gray-400 hover:bg-white/[0.05] hover:text-gray-200")
              }
            >
              {w.pt}
              {dateByWeekday.get(w.en) ? (
                <span className="opacity-60"> {dateByWeekday.get(w.en)}</span>
              ) : null}{" "}
              <span className="opacity-60">({n})</span>
            </button>
          );
        })}
        </div>
        {canEdit ? (
          <button
            onClick={runCreate}
            disabled={copying || !selectedISO}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            title={`Adicionar novo torneio em ${ptWeekday(day)}`}
          >
            + Adicionar torneio
          </button>
        ) : null}
      </div>

      {/* Construtor de mês: cópia dia a dia / semana anterior (ADMIN, dia vazio) */}
      {canEdit && dayEmpty ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2">
          <span className="text-sm text-emerald-300">{ptWeekday(day)} está vazio.</span>
          <button
            onClick={runCopyDay}
            disabled={copying || !source || !selectedISO}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            title={source ? `Copia ${ptWeekday(day)} de ${fmtISO(source)}` : "Sem dia anterior para copiar"}
          >
            {copying
              ? "Copiando…"
              : source
                ? `Copiar último ${ptWeekday(day)} (${fmtISO(source)})`
                : `Sem ${ptWeekday(day)} anterior`}
          </button>
          <button
            onClick={runCopyWeek}
            disabled={copying || !weekStartISO}
            className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            title="Preenche a semana inteira copiando a semana anterior"
          >
            Copiar semana anterior completa
          </button>
          {copyMsg ? (
            <span className={"text-xs " + (copyMsg.ok ? "text-emerald-400" : "text-red-400")}>
              {copyMsg.text}
            </span>
          ) : null}
        </div>
      ) : null}
      {canEdit && !dayEmpty && copyMsg ? (
        <p className={"text-xs " + (copyMsg.ok ? "text-emerald-400" : "text-red-400")}>
          {copyMsg.text}
        </p>
      ) : null}

      <p className="text-xs text-gray-500">
        A coluna <strong>Ações</strong> (entradas p/ cobrir o GTD) e as taxas são
        internas do Admin — não aparecem no portal público.
      </p>

      <div className="overflow-x-auto rounded-lg border border-white/[0.08]">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-white/[0.02] text-left">
            <tr>
              {HOT_FIELDS.map((f) => (
                <th
                  key={f.key}
                  className="whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {f.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-2 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Ações 🔒
              </th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <GradeRow
                key={row.id}
                row={row}
                canEdit={canEdit}
                onOpenDetail={() => setDetail(row)}
              />
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={HOT_FIELDS.length + 2}
                  className="px-3 py-6 text-center text-gray-500"
                >
                  Nenhum torneio em {ptWeekday(day)}.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {activeDetail ? (
        <DetailDrawer row={activeDetail} canEdit={canEdit} onClose={closeDetail} />
      ) : null}
    </div>
  );
}

function GradeRow({
  row,
  canEdit,
  onOpenDetail,
}: {
  row: TournamentRow;
  canEdit: boolean;
  onOpenDetail: () => void;
}) {
  const field = computeField(
    { buyIn: row.buyIn, fee: row.fee, adminFee: row.adminFee, gtd: row.gtd },
    { includeAdminFee: true },
  );

  return (
    <tr className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.02]">
      {HOT_FIELDS.map((f) => (
        <td key={f.key} className="px-2 py-1 align-top">
          <EditableCell id={row.id} field={f} value={row[f.key as keyof TournamentRow]} canEdit={canEdit} />
        </td>
      ))}
      <td className="px-2 py-1 text-center font-medium text-emerald-400">
        {field?.requiredEntries ?? "—"}
      </td>
      <td className="px-2 py-1 text-right">
        <button
          onClick={onOpenDetail}
          className="rounded border border-white/[0.12] px-2 py-1 text-xs text-gray-300 hover:border-white/[0.2] hover:bg-white/[0.05]"
          title="Ver / editar todos os campos"
        >
          ⋯
        </button>
      </td>
    </tr>
  );
}

type CellValue = string | number | boolean | null;

function EditableCell({
  id,
  field,
  value,
  canEdit,
}: {
  id: string;
  field: FieldMeta;
  value: CellValue;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function commit(next: string | boolean) {
    setError(null);
    const current =
      field.kind === "bool"
        ? Boolean(value)
        : field.kind === "select"
          ? selectDisplayValue(field.key, value)
          : String(value ?? "");
    const nextComparable = field.kind === "bool" ? Boolean(next) : String(next);
    if (current === nextComparable) return;

    startTransition(async () => {
      const res = await updateTournament(id, { [field.key]: next });
      if (!res.ok) setError(res.error ?? "Erro ao salvar.");
    });
  }

  const base =
    "w-full rounded border bg-transparent px-1.5 py-1 text-sm text-gray-200 outline-none " +
    (error
      ? "border-red-500"
      : pending
        ? "border-amber-400"
        : "border-transparent hover:border-white/[0.12] focus:border-white/[0.3]");

  if (field.kind === "bool") {
    return (
      <input
        type="checkbox"
        defaultChecked={Boolean(value)}
        disabled={!canEdit || pending}
        onChange={(e) => commit(e.target.checked)}
        className="h-4 w-4"
        title={error ?? undefined}
      />
    );
  }

  if (field.kind === "select") {
    return (
      <select
        defaultValue={selectDisplayValue(field.key, value)}
        disabled={!canEdit || pending}
        onChange={(e) => commit(e.target.value)}
        className={base + " min-w-[7rem]"}
        title={error ?? undefined}
      >
        <option value="" className="bg-[#121316]">
          —
        </option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt} className="bg-[#121316]">
            {field.key === "dayOfWeek" ? ptWeekday(opt) : opt}
          </option>
        ))}
      </select>
    );
  }

  const isNumeric = field.kind === "number" || field.kind === "int";
  const widthCls = field.key === "shortName" ? "min-w-[16rem]" : isNumeric ? "w-24" : "min-w-[8rem]";

  return (
    <input
      type={isNumeric ? "number" : "text"}
      step={field.kind === "int" ? "1" : "any"}
      defaultValue={value == null ? "" : String(value)}
      disabled={!canEdit || pending}
      onBlur={(e) => commit(e.target.value)}
      className={base + " " + widthCls}
      title={error ?? undefined}
    />
  );
}

function DetailDrawer({
  row,
  canEdit,
  onClose,
}: {
  row: TournamentRow;
  canEdit: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    if (!canEdit) return;
    setError(null);
    startTransition(async () => {
      const res = await duplicateTournament(row.id);
      if (!res.ok) setError(res.error ?? "Falha ao duplicar.");
      else {
        onClose();
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!canEdit) return;
    const label = row.shortName ?? row.name;
    if (!window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteTournament(row.id);
      if (!res.ok) setError(res.error ?? "Falha ao excluir.");
      else {
        onClose();
        router.refresh();
      }
    });
  }

  const sections = useMemo(() => {
    const map = new Map<string, FieldMeta[]>();
    for (const f of TOURNAMENT_FIELDS) {
      const arr = map.get(f.section) ?? [];
      arr.push(f);
      map.set(f.section, arr);
    }
    return [...map.entries()];
  }, []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    const fd = new FormData(e.currentTarget);
    const patch: Record<string, unknown> = {};
    for (const f of TOURNAMENT_FIELDS) {
      patch[f.key] = f.kind === "bool" ? fd.has(f.key) : fd.get(f.key);
    }
    setError(null);
    startTransition(async () => {
      const res = await updateTournament(row.id, patch);
      if (!res.ok) setError(res.error ?? "Erro ao salvar.");
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-[#121316] p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{row.shortName ?? row.name}</h2>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-200">
            Fechar ✕
          </button>
        </div>

        {!canEdit ? (
          <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            Somente leitura (Operacional).
          </p>
        ) : null}

        <form onSubmit={onSubmit}>
          <fieldset disabled={!canEdit} className="flex flex-col gap-5">
            {sections.map(([section, fields]) => (
              <div key={section}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {section}
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {fields.map((f) => (
                    <DrawerField key={f.key} field={f} value={row[f.key as keyof TournamentRow]} />
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          {error ? (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          {canEdit ? (
            <div className="sticky bottom-0 mt-6 flex gap-2 bg-[#121316] py-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {pending ? "Salvando…" : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm font-medium text-gray-300 hover:border-white/[0.2] hover:bg-white/[0.05]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={pending}
                className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm font-medium text-gray-300 hover:border-white/[0.2] hover:bg-white/[0.05] disabled:opacity-60"
              >
                Duplicar torneio
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="ml-auto rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-60"
              >
                Excluir torneio
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function DrawerField({ field, value }: { field: FieldMeta; value: CellValue }) {
  const cls =
    "w-full rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-white/[0.3] disabled:opacity-70";

  if (field.kind === "bool") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={field.key} defaultChecked={Boolean(value)} className="h-4 w-4" />
        <span className="text-gray-300">{field.label}</span>
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-gray-400">{field.label}</span>
      {field.kind === "select" ? (
        <select name={field.key} defaultValue={selectDisplayValue(field.key, value)} className={cls}>
          <option value="" className="bg-[#121316]">
            —
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt} className="bg-[#121316]">
              {field.key === "dayOfWeek" ? ptWeekday(opt) : opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.kind === "number" || field.kind === "int" ? "number" : "text"}
          step={field.kind === "int" ? "1" : "any"}
          name={field.key}
          defaultValue={value == null ? "" : String(value)}
          className={cls}
        />
      )}
    </label>
  );
}
