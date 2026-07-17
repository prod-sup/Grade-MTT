"use client";

import { useCallback } from "react";
import { FlyerModal } from "@/components/flyer/modal";
import { useFlyerStage } from "@/components/flyer/stage";
import { downloadDataUrl } from "@/lib/flyer/download";
import type { FlyerLayout, FlyerTournament, PartnerOverlay } from "@/lib/flyer/types";
import { GLASS_CARD, TEXT_SECONDARY } from "@/lib/ui/premium";

export function PartnerFlyerManager({
  tournaments,
  overlay,
}: {
  tournaments: FlyerTournament[];
  overlay?: PartnerOverlay;
}) {
  const onCaptured = useCallback(
    (dataUrl: string, layout: FlyerLayout) => downloadDataUrl(dataUrl, `flyer-${layout.toLowerCase()}`),
    [],
  );
  const { generate, busy, stage } = useFlyerStage(onCaptured);

  return (
    <div className={`${GLASS_CARD} flex flex-col gap-4 p-6`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm ${TEXT_SECONDARY}`}>
          {tournaments.length} torneio(s) disponível(is) nos próximos 14 dias.
        </p>
        <FlyerModal
          available={tournaments}
          busy={busy}
          onGenerate={(layout, items) => generate(layout, items, overlay)}
          triggerLabel="Gerar Flyer"
          actionLabel="Baixar imagem"
          sourceHint="da grade"
        />
      </div>
      {stage}
    </div>
  );
}
