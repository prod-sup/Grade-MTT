"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { FlyerLayout, FlyerTournament } from "@/lib/flyer/types";
import { FLYER_RENDERERS } from "./templates";

interface FlyerRequest {
  layout: FlyerLayout;
  items: FlyerTournament[];
}

/**
 * Hook que renderiza o layout escolhido fora da tela e captura o PNG via
 * html-to-image assim que o DOM estiver pronto (dupla rAF garante que o
 * layout/paint terminou antes da captura). `stage` deve ser incluído uma
 * única vez na árvore (ex.: no componente de topo do portal/admin).
 *
 * `onCaptured` decide o que fazer com o PNG gerado: o portal público baixa o
 * arquivo direto (`downloadDataUrl`); o painel de Marketing usa o dataURL
 * para salvar um `MarketingBanner` no servidor.
 */
export function useFlyerStage(
  onCaptured: (dataUrl: string, layout: FlyerLayout, items: FlyerTournament[]) => void,
) {
  const [request, setRequest] = useState<FlyerRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const generate = useCallback((layout: FlyerLayout, items: FlyerTournament[]) => {
    if (items.length === 0) return;
    setRequest({ layout, items });
  }, []);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    setBusy(true);

    (async () => {
      // Dupla rAF: garante que o navegador aplicou layout/paint da cápsula
      // recém-montada antes de capturar (html-to-image lê estilos computados).
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const node = stageRef.current;
      if (!node || cancelled) return;
      try {
        const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
        if (cancelled) return;
        onCaptured(dataUrl, request.layout, request.items);
      } finally {
        if (!cancelled) {
          setBusy(false);
          setRequest(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [request, onCaptured]);

  const stage = request ? (
    <div style={{ position: "fixed", top: 0, left: -99999, zIndex: -1 }} aria-hidden>
      <div ref={stageRef}>
        <FlyerCapture layout={request.layout} items={request.items} />
      </div>
    </div>
  ) : null;

  return { generate, busy, stage };
}

function FlyerCapture({ layout, items }: FlyerRequest) {
  const Renderer = FLYER_RENDERERS[layout];
  return <Renderer items={items} />;
}
