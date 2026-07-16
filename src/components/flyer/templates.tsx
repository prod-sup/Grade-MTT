/**
 * "Cápsulas de Dados" dos flyers de marketing (Roadmap V2, seção 2).
 * Componentes puramente apresentacionais — são renderizados fora da tela pelo
 * stage de captura (`stage.tsx`) e convertidos em PNG via html-to-image.
 * Largura fixa em px (não responsiva): é a imagem final a ser baixada.
 */
import type { FlyerLayout, FlyerTournament } from "@/lib/flyer/types";

const CANVAS_WIDTH = 1000;
const CANVAS_BG = "#0b0b0f";
const GOLD = "#f2b544";

function Header() {
  return (
    <div className="flex items-center justify-between px-10 pt-10">
      <span className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: GOLD }}>
        Suprema Poker
      </span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">Grade Oficial</span>
    </div>
  );
}

function Footer() {
  return (
    <div className="px-10 pb-10 pt-6 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
      Suprema Poker — Jogue com responsabilidade
    </div>
  );
}

function TechRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map((it) => (
        <div key={it.label} className="rounded-md bg-white/5 px-2 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-zinc-400">{it.label}</p>
          <p className="text-sm font-semibold text-white">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function Capsule({ t, compact = false }: { t: FlyerTournament; compact?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{ borderColor: "rgba(242,181,68,0.35)", background: "rgba(255,255,255,0.03)" }}
    >
      <div
        className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: GOLD }}
      >
        <span>{t.dateLabel}</span>
        <span>{t.modality}</span>
      </div>
      <h2 className={"mt-2 font-bold leading-tight text-white " + (compact ? "text-xl" : "text-3xl")}>
        {t.name}
      </h2>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-widest text-zinc-400">Garantido</span>
        <span className={"font-black " + (compact ? "text-4xl" : "text-6xl")} style={{ color: GOLD }}>
          {t.gtdCompact}
        </span>
        <span className="text-xs text-zinc-500">{t.currencyLabel}</span>
      </div>
      <div className="mt-4">
        <TechRow
          items={[
            { label: "Start", value: t.startTime },
            { label: "Late", value: t.lateReg },
            { label: "Buy-in", value: t.buyIn },
            { label: "Blinds", value: t.blinds },
            { label: "Stack", value: t.stack },
          ]}
        />
      </div>
    </div>
  );
}

function SingleFlyer({ items }: { items: FlyerTournament[] }) {
  const t = items[0];
  if (!t) return null;
  return (
    <div style={{ width: CANVAS_WIDTH, background: CANVAS_BG }} className="flex flex-col text-white">
      <Header />
      <div className="flex flex-1 flex-col justify-center px-10 py-14">
        <Capsule t={t} />
      </div>
      <Footer />
    </div>
  );
}

function DoubleFlyer({ items }: { items: FlyerTournament[] }) {
  return (
    <div style={{ width: CANVAS_WIDTH, background: CANVAS_BG }} className="flex flex-col text-white">
      <Header />
      <div className="flex flex-1 flex-col gap-5 px-10 py-10">
        {items.slice(0, 2).map((t) => (
          <Capsule key={t.id} t={t} compact />
        ))}
      </div>
      <Footer />
    </div>
  );
}

function TripleFlyer({ items }: { items: FlyerTournament[] }) {
  return (
    <div style={{ width: CANVAS_WIDTH, background: CANVAS_BG }} className="flex flex-col text-white">
      <Header />
      <div className="flex flex-1 flex-col gap-4 px-10 py-10">
        {items.slice(0, 3).map((t) => (
          <Capsule key={t.id} t={t} compact />
        ))}
      </div>
      <Footer />
    </div>
  );
}

function ListFlyer({ items }: { items: FlyerTournament[] }) {
  const rows = items.slice(0, 12);
  return (
    <div style={{ width: CANVAS_WIDTH, background: CANVAS_BG }} className="flex flex-col text-white">
      <Header />
      <div className="px-10 py-10">
        <h2 className="mb-5 text-2xl font-bold uppercase tracking-wide" style={{ color: GOLD }}>
          Cronograma
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-400">
              <th className="border-b border-white/10 py-2 pr-3">Start</th>
              <th className="border-b border-white/10 py-2 pr-3">Torneio</th>
              <th className="border-b border-white/10 py-2 pr-3">GTD</th>
              <th className="border-b border-white/10 py-2 pr-3">Buy-in</th>
              <th className="border-b border-white/10 py-2">Late</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="py-2 pr-3 font-medium">{t.startTime}</td>
                <td className="py-2 pr-3">{t.name}</td>
                <td className="py-2 pr-3 font-semibold" style={{ color: GOLD }}>
                  {t.gtdCompact}
                </td>
                <td className="py-2 pr-3">{t.buyIn}</td>
                <td className="py-2">{t.lateReg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </div>
  );
}

export const FLYER_RENDERERS: Record<FlyerLayout, (props: { items: FlyerTournament[] }) => React.ReactElement | null> = {
  SINGLE: SingleFlyer,
  DOUBLE: DoubleFlyer,
  TRIPLE: TripleFlyer,
  LIST: ListFlyer,
};
