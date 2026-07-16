"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlyerModal } from "@/components/flyer/modal";
import { useFlyerStage } from "@/components/flyer/stage";
import { FLYER_LAYOUT_LABELS, type FlyerLayout, type FlyerTournament } from "@/lib/flyer/types";
import { createMarketingBanner, deleteMarketingBanner, updateMarketingBanner } from "./actions";

export interface BannerRow {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
  seriesName: string | null;
  active: boolean;
}

export interface SeriesGroup {
  seriesName: string;
  tournaments: FlyerTournament[];
}

type Tab = "GRADE" | "SERIES";

export function MarketingManager({
  banners,
  gradeTournaments,
  seriesGroups,
  canEdit,
}: {
  banners: BannerRow[];
  gradeTournaments: FlyerTournament[];
  seriesGroups: SeriesGroup[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("GRADE");
  const [seriesFilter, setSeriesFilter] = useState<string>(seriesGroups[0]?.seriesName ?? "");
  const [pending, setPending] = useState<{ dataUrl: string; layout: FlyerLayout } | null>(null);

  const onCaptured = useCallback((dataUrl: string, layout: FlyerLayout) => {
    setPending({ dataUrl, layout });
  }, []);
  const { generate, busy, stage } = useFlyerStage(onCaptured);

  const available =
    tab === "GRADE"
      ? gradeTournaments
      : seriesGroups.find((g) => g.seriesName === seriesFilter)?.tournaments ?? [];

  const visibleBanners = banners.filter((b) =>
    tab === "GRADE" ? b.seriesName === null : b.seriesName !== null,
  );

  function handleSaved() {
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Abas Grade / Séries */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={tab === "GRADE"} onClick={() => setTab("GRADE")}>
          Flyers da Grade
        </TabButton>
        <TabButton active={tab === "SERIES"} onClick={() => setTab("SERIES")}>
          Flyers de Séries
        </TabButton>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          {tab === "SERIES" ? (
            seriesGroups.length > 0 ? (
              <select
                value={seriesFilter}
                onChange={(e) => setSeriesFilter(e.target.value)}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {seriesGroups.map((g) => (
                  <option key={g.seriesName} value={g.seriesName}>
                    {g.seriesName}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-zinc-500">Nenhuma série programada nos próximos dias.</p>
            )
          ) : null}

          <FlyerModal
            available={available}
            busy={busy}
            onGenerate={(layout, items) => generate(layout, items)}
            triggerLabel="+ Novo Flyer"
            actionLabel="Gerar Flyer"
            sourceHint={tab === "SERIES" ? `da série ${seriesFilter || "selecionada"}` : "da grade"}
          />
        </div>
      ) : null}

      {pending ? (
        <SaveBannerForm
          dataUrl={pending.dataUrl}
          layout={pending.layout}
          seriesName={tab === "SERIES" ? seriesFilter || null : null}
          onCancel={() => setPending(null)}
          onSaved={handleSaved}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleBanners.map((b) => (
          <BannerCard key={b.id} banner={b} canEdit={canEdit} onChanged={() => router.refresh()} />
        ))}
        {visibleBanners.length === 0 ? (
          <p className="col-span-full rounded-md border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nenhum flyer {tab === "SERIES" ? "de série" : "da grade"} ainda.
          </p>
        ) : null}
      </div>

      {stage}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-t-md px-3 py-2 text-sm font-medium transition-colors " +
        (active
          ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")
      }
    >
      {children}
    </button>
  );
}

function SaveBannerForm({
  dataUrl,
  layout,
  seriesName,
  onCancel,
  onSaved,
}: {
  dataUrl: string;
  layout: FlyerLayout;
  seriesName: string | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(FLYER_LAYOUT_LABELS[layout]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await createMarketingBanner({ title, type: layout, seriesName, dataUrl });
      if (!res.ok) setError(res.error ?? "Falha ao salvar.");
      else onSaved();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/40">
      <span className="text-sm text-amber-800 dark:text-amber-300">Flyer gerado — salvar como:</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="button"
        disabled={pending || !title.trim()}
        onClick={save}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Descartar
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

function BannerCard({
  banner,
  canEdit,
  onChanged,
}: {
  banner: BannerRow;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(banner.title);
  const [error, setError] = useState<string | null>(null);

  function toggleActive() {
    startTransition(async () => {
      const res = await updateMarketingBanner(banner.id, { active: !banner.active });
      if (!res.ok) setError(res.error ?? "Falha ao salvar.");
      else onChanged();
    });
  }

  function saveTitle() {
    if (title === banner.title) return;
    startTransition(async () => {
      const res = await updateMarketingBanner(banner.id, { title });
      if (!res.ok) setError(res.error ?? "Falha ao salvar.");
      else onChanged();
    });
  }

  function remove() {
    if (!confirm(`Excluir o flyer "${banner.title}"?`)) return;
    startTransition(async () => {
      const res = await deleteMarketingBanner(banner.id);
      if (!res.ok) setError(res.error ?? "Falha ao excluir.");
      else onChanged();
    });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt={banner.title} className="h-40 w-full object-cover" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {FLYER_LAYOUT_LABELS[banner.type as FlyerLayout] ?? banner.type}
          {banner.seriesName ? ` · ${banner.seriesName}` : ""}
        </span>
        {canEdit ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            disabled={pending}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        ) : (
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{banner.title}</span>
        )}

        {canEdit ? (
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input
                type="checkbox"
                checked={banner.active}
                disabled={pending}
                onChange={toggleActive}
                className="h-4 w-4"
              />
              Ativo
            </label>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              Excluir
            </button>
          </div>
        ) : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
