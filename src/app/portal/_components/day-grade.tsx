"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { WEEKDAYS } from "@/lib/conversion";
import type { FlyerLayout, FlyerTournament } from "@/lib/flyer/types";
import { downloadDataUrl } from "@/lib/flyer/download";
import { FlyerModal } from "@/components/flyer/modal";
import { useFlyerStage } from "@/components/flyer/stage";
import { GHOST_BUTTON, GLASS_CARD, GLASS_CARD_HOVER, GOLD_GRADIENT_BG } from "@/lib/ui/premium";

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
        <span className="text-sm font-semibold text-white">{weekNav.label}</span>
        <div className="flex items-center gap-2">
          <WeekNavButton href={weekNav.nextHref} enabled={weekNav.hasNext} label="Próxima semana ›" />
          <FlyerModal available={rows.map((r) => r.flyer)} busy={busy} onGenerate={handleGenerate} />
        </div>
      </div>

      {/* Menu horizontal de dias */}
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((w) => {
          const d = days.find((x) => x.en === w.en);
          const active = w.en === dayEn;
          return (
            <button
              key={w.en}
              type="button"
              onClick={() => setDayEn(w.en)}
              className={
                "rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 " +
                (active
                  ? `${GOLD_GRADIENT_BG} text-black font-semibold shadow-[0_0_15px_rgba(212,175,55,0.18)]`
                  : "border border-white/[0.08] bg-white/[0.03] text-gray-400 hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-gray-200")
              }
            >
              {w.ptShort}
              {d ? <span className="opacity-70"> {d.dateLabel.slice(0, 5)}</span> : null}
              {d && d.rows.length > 0 ? <span className="opacity-70"> ({d.rows.length})</span> : null}
            </button>
          );
        })}
      </div>

      {current ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">
            {current.weekdayLabel}{" "}
            <span className="text-sm font-normal text-gray-500">{current.dateLabel}</span>
          </h2>

          {rows.length === 0 ? (
            <p className={`rounded-2xl border border-dashed border-white/[0.12] px-4 py-10 text-center text-sm text-gray-500`}>
              Nenhum torneio disponível neste dia.
            </p>
          ) : (
            <>
              {/* Tabela — desktop/tablet */}
              <div className={`hidden overflow-x-auto md:block ${GLASS_CARD}`}>
                <table className="w-full border-collapse text-sm">
                  <thead className="text-left">
                    <tr className="border-b border-white/[0.08]">
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
                    {rows.map((r) => {
                      const kind = classifyType(r.type);
                      return (
                        <tr
                          key={r.id}
                          className="border-t border-white/[0.06] transition-colors hover:bg-white/[0.02]"
                        >
                          <Td
                            className={
                              "whitespace-nowrap font-medium text-gray-200" +
                              (kind === "main" ? " border-l-2 border-[#d4af37]/50" : "")
                            }
                          >
                            {r.startTime}
                            {r.startDayOffset !== 0 ? (
                              <span className="ml-1 text-xs text-[#d4af37]">
                                {r.startDayOffset > 0 ? "+1d" : "-1d"}
                              </span>
                            ) : null}
                          </Td>
                          <Td>
                            <span className="flex items-center gap-2 text-gray-200">
                              {kind === "main" ? <span title="Main Event">👑</span> : null}
                              {r.shortName}
                              <TypeTag type={r.type} kind={kind} />
                            </span>
                          </Td>
                          <Td className="font-semibold text-[#d4af37]">{r.gtd}</Td>
                          <Td className="text-gray-300">{r.buyIn}</Td>
                          <Td className="text-gray-400">{r.reentry}</Td>
                          <Td className="text-gray-400">{r.addon}</Td>
                          <Td className="whitespace-nowrap text-gray-400">{r.blinds}</Td>
                          <Td className="whitespace-nowrap text-gray-400">{r.stack}</Td>
                          <Td className="whitespace-nowrap text-gray-400">{r.lateReg}</Td>
                          <Td className="text-right">
                            <button
                              type="button"
                              title="Gerar Flyer Single deste torneio"
                              disabled={busy}
                              onClick={() => generate("SINGLE", [r.flyer])}
                              className={`rounded-lg px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${GHOST_BUTTON}`}
                            >
                              Flyer
                            </button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards — mobile */}
              <div className="flex flex-col gap-3 md:hidden">
                {rows.map((r) => {
                  const kind = classifyType(r.type);
                  return (
                    <div
                      key={r.id}
                      className={`${GLASS_CARD} ${GLASS_CARD_HOVER} flex flex-col gap-3 p-4 ${
                        kind === "main" ? "border-[#d4af37]/40" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                            {kind === "main" ? <span title="Main Event">👑</span> : null}
                            {r.shortName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {r.startTime}
                            {r.startDayOffset !== 0 ? (
                              <span className="ml-1 text-[#d4af37]">
                                {r.startDayOffset > 0 ? "+1d" : "-1d"}
                              </span>
                            ) : null}
                          </p>
                          <div className="mt-1.5">
                            <TypeTag type={r.type} kind={kind} />
                          </div>
                        </div>
                        <p className="shrink-0 text-2xl font-bold text-[#d4af37]">{r.gtd}</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-2">
                          <span>{r.buyIn} buy-in</span>
                          <span className="text-gray-600">•</span>
                          <span>{r.stack} stack</span>
                          <span className="text-gray-600">•</span>
                          <span>{r.lateReg}</span>
                        </span>
                        <button
                          type="button"
                          title="Gerar Flyer Single deste torneio"
                          disabled={busy}
                          onClick={() => generate("SINGLE", [r.flyer])}
                          className={`rounded-lg px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${GHOST_BUTTON}`}
                        >
                          Flyer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {stage}
    </div>
  );
}

/** Classifica o texto livre de `type` para decidir o estilo do destaque (Main/SAT/Side). */
function classifyType(type: string): "main" | "sat" | "side" {
  const t = type.toLowerCase();
  if (t.includes("main")) return "main";
  if (t.includes("sat")) return "sat";
  return "side";
}

function TypeTag({ type, kind }: { type: string; kind: "main" | "sat" | "side" }) {
  const cls =
    kind === "main"
      ? "border-[#d4af37]/40 bg-[#d4af37]/10 text-[#f3e5ab]"
      : kind === "sat"
        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
        : "border-white/[0.12] bg-white/[0.05] text-gray-400";
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {type}
    </span>
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
  const cls = "rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200";
  if (!enabled) {
    return (
      <span className={`${cls} cursor-not-allowed border border-white/[0.06] text-gray-600`}>
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={`${cls} border ${GHOST_BUTTON}`}>
      {label}
    </Link>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}
