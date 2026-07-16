"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { WEEKDAYS } from "@/lib/conversion";
import type { FlyerLayout, FlyerTournament } from "@/lib/flyer/types";
import { downloadDataUrl } from "@/lib/flyer/download";
import { FlyerModal } from "@/components/flyer/modal";
import { useFlyerStage } from "@/components/flyer/stage";

/** Linha da grade já pronta para exibição (tabela) e para injeção no flyer. */
export interface PortalRow {
  id: string;
  type: string;
  startTime: string;
  startDayOffset: number;
  shortName: string;
  gtd: string;
  buyIn: string;
  reentry: string;
  addon: string;
  blinds: string;
  lateReg: string;
  stack: string;
  flyer: FlyerTournament;
}

export interface PortalDay {
  en: string;
  dateLabel: string;
  weekdayLabel: string;
  rows: PortalRow[];
}

/**
 * Grade diária do portal público: menu horizontal de dias (Seg..Dom) em vez
 * da rolagem vertical antiga, tabela do dia selecionado (com a coluna Stack)
 * e o motor de geração de flyers (botão geral + botão rápido por linha).
 */
export interface WeekNav {
  prevHref: string;
  nextHref: string;
  hasPrev: boolean;
  hasNext: boolean;
  label: string;
}

export function DayGrade({
  days,
  defaultDayEn,
  weekNav,
}: {
  days: PortalDay[];
  defaultDayEn: string;
  weekNav: WeekNav;
}) {
  const [dayEn, setDayEn] = useState(defaultDayEn);
  const onCaptured = useCallback(
    (dataUrl: string, layout: FlyerLayout) => downloadDataUrl(dataUrl, `flyer-${layout.toLowerCase()}`),
    [],
  );
  const { generate, busy, stage } = useFlyerStage(onCaptured);

  const current = days.find((d) => d.en === dayEn) ?? days[0];
  const rows = current?.rows ?? [];

  function handleGenerate(layout: FlyerLayout, items: FlyerTournament[]) {
    generate(layout, items);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Navegação por semana + Gerar Flyer (geral) */}
      <div className="flex items-center justify-between gap-2">
        <WeekNavButton href={weekNav.prevHref} enabled={weekNav.hasPrev} label="‹ Semana anterior" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{weekNav.label}</span>
        <div className="flex items-center gap-2">
          <WeekNavButton href={weekNav.nextHref} enabled={weekNav.hasNext} label="Próxima semana ›" />
          <FlyerModal available={rows.map((r) => r.flyer)} busy={busy} onGenerate={handleGenerate} />
        </div>
      </div>

      {/* Menu horizontal de dias */}
      <div className="flex flex-wrap gap-1">
        {WEEKDAYS.map((w) => {
          const d = days.find((x) => x.en === w.en);
          const active = w.en === dayEn;
          return (
            <button
              key={w.en}
              type="button"
              onClick={() => setDayEn(w.en)}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800")
              }
            >
              {w.ptShort}
              {d ? <span className="opacity-60"> {d.dateLabel.slice(0, 5)}</span> : null}
              {d && d.rows.length > 0 ? <span className="opacity-60"> ({d.rows.length})</span> : null}
            </button>
          );
        })}
      </div>

      {current ? (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {current.weekdayLabel}{" "}
            <span className="text-sm font-normal text-zinc-500">{current.dateLabel}</span>
          </h2>

          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
              Nenhum torneio disponível neste dia.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
                  <tr>
                    <Th>Horário</Th>
                    <Th>Torneio</Th>
                    <Th>GTD</Th>
                    <Th>Buy-in</Th>
                    <Th>Reentry</Th>
                    <Th>Add-on</Th>
                    <Th>Blinds</Th>
                    <Th>Stack</Th>
                    <Th>Late Reg</Th>
                    <Th>
                      <span className="sr-only">Flyer</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <Td className="whitespace-nowrap font-medium">
                        {r.startTime}
                        {r.startDayOffset !== 0 ? (
                          <span className="ml-1 text-xs text-amber-600">
                            {r.startDayOffset > 0 ? "+1d" : "-1d"}
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        {r.shortName}
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {r.type}
                        </span>
                      </Td>
                      <Td>{r.gtd}</Td>
                      <Td>{r.buyIn}</Td>
                      <Td>{r.reentry}</Td>
                      <Td>{r.addon}</Td>
                      <Td className="whitespace-nowrap">{r.blinds}</Td>
                      <Td className="whitespace-nowrap">{r.stack}</Td>
                      <Td className="whitespace-nowrap">{r.lateReg}</Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          title="Gerar Flyer Single deste torneio"
                          disabled={busy}
                          onClick={() => generate("SINGLE", [r.flyer])}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          Flyer
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {stage}
    </div>
  );
}

function WeekNavButton({
  href,
  enabled,
  label,
}: {
  href: string;
  enabled: boolean;
  label: string;
}) {
  const cls = "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";
  if (!enabled) {
    return (
      <span className={`${cls} cursor-not-allowed border-zinc-200 text-zinc-300 dark:border-zinc-800 dark:text-zinc-700`}>
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${cls} border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800`}
    >
      {label}
    </Link>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-zinc-800 dark:text-zinc-200 ${className}`}>{children}</td>;
}
