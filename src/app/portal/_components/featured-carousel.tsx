import { GLASS_CARD, TEXT_MUTED, TEXT_PRIMARY, TEXT_SECONDARY } from "@/lib/ui/premium";

export interface FeaturedCard {
  id: string;
  shortName: string;
  gtd: string;
  startTime: string;
  startDayOffset: number;
  dateLabel: string;
  isMain: boolean;
}

/**
 * Carrossel de Torneios em Destaque (Main Event ou `featured=true`) ainda
 * por vir — flutuação contínua (marquee), sem rolagem manual/scrollbar. A
 * lista já chega filtrada pelo servidor (`isTournamentStillUpcoming`) — um
 * card some da rotação assim que o torneio começa (ou, sem horário válido,
 * quando o dia dele encerra).
 */
export function FeaturedCarousel({ items }: { items: FeaturedCard[] }) {
  if (items.length === 0) return null;

  // Duplicado pro loop parecer contínuo (a animação anda 50% da largura,
  // que é exatamente uma cópia da lista). Duração cresce com a quantidade
  // de cards pra manter a velocidade de flutuação constante.
  const track = [...items, ...items];
  const durationSeconds = Math.max(items.length * 4, 18);

  return (
    <div className="flex flex-col gap-2">
      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${TEXT_MUTED}`}>
        Torneios em Destaque
      </p>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div
          className="marquee-track flex w-max gap-3"
          style={{ "--marquee-duration": `${durationSeconds}s` } as React.CSSProperties}
        >
          {track.map((c, i) => (
            <div
              key={`${c.id}-${i}`}
              className={
                `${GLASS_CARD} flex w-[190px] shrink-0 flex-col gap-2 p-4 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] ` +
                (c.isMain
                  ? "border-[#d4af37]/50 hover:shadow-[0_0_18px_rgba(212,175,55,0.2)]"
                  : "border-cyan-400/30 hover:shadow-[0_0_18px_rgba(34,211,238,0.15)]")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-medium uppercase tracking-wide ${TEXT_MUTED}`}>
                  {c.dateLabel}
                </span>
                {c.isMain ? <span title="Main Event">👑</span> : null}
              </div>
              <p className={`truncate text-sm font-semibold ${TEXT_PRIMARY}`}>{c.shortName}</p>
              <p className="text-xl font-bold text-[#d4af37]">{c.gtd}</p>
              <p className={`text-xs ${TEXT_SECONDARY}`}>
                {c.startTime}
                {c.startDayOffset !== 0 ? (
                  <span className="ml-1 text-[#d4af37]">
                    {c.startDayOffset > 0 ? "+1d" : "-1d"}
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
