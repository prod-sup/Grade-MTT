/**
 * Match de séries (Roadmap V2, item 4).
 * ---------------------------------------------------------------------------
 * Classifica cada linha de um Excel de série contra os torneios "base" que já
 * existem no MESMO slot (data + horário). Regra confirmada pelo usuário:
 *   GREEN  = substitui um base com confiança (núcleo do nome bate, único)
 *   YELLOW = dúvida (vários candidatos com o mesmo núcleo)
 *   RED    = inédito (nenhum base com núcleo compatível no slot) → cria
 *   SAME   = idêntico a um base (off-série inalterado) → sem ação
 *
 * Núcleo do nome: o nome-base é o "miolo" contido no nome da série. Ex.:
 *   base "OmaX HR"  ⊂  série "SPS 26-M OmaX HR"  → mesmo núcleo "OMAX HR".
 * Removemos o prefixo "SPS", códigos ("26-M", "+76-M") e sufixos "+SPS/+SPT".
 */

export type MatchStatus = "GREEN" | "YELLOW" | "RED" | "SAME";

export interface NamedTournament {
  id?: string;
  shortName?: string | null;
  name: string;
  gtd?: number | null;
  buyIn?: number | null;
}

export interface Classification {
  status: MatchStatus;
  matchBaseId?: string;
  reviewNote?: string;
}

/** Reduz um nome ao seu "núcleo" comparável (sem SPS, códigos e sufixos). */
export function normalizeCore(raw: string | null | undefined): string {
  let s = (raw ?? "").toUpperCase();
  s = s.replace(/\+?\d+\s*-\s*[ML]\b/g, " "); // códigos: 26-M, +76-M, 312-L
  s = s.replace(/\+SP[ST]\b/g, " "); // sufixos +SPS / +SPT
  s = s.replace(/\bSP[ST]\b/g, " "); // token SPS / SPT / SPT solto
  s = s.replace(/\+/g, " "); // "+" restante vira espaço
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function nameOf(t: NamedTournament): string {
  return t.shortName && t.shortName.trim() !== "" ? t.shortName : t.name;
}

/** Duas linhas são "idênticas" (off-série inalterado) se nome+GTD+buy-in batem. */
function isIdentical(a: NamedTournament, b: NamedTournament): boolean {
  return (
    nameOf(a).trim().toUpperCase() === nameOf(b).trim().toUpperCase() &&
    (a.gtd ?? null) === (b.gtd ?? null) &&
    (a.buyIn ?? null) === (b.buyIn ?? null)
  );
}

/**
 * Classifica uma linha da série contra os torneios base do mesmo slot.
 * @param seriesRow  Linha vinda do Excel da série.
 * @param candidates Torneios existentes no MESMO slot (data + horário).
 */
export function classifyRow(
  seriesRow: NamedTournament,
  candidates: NamedTournament[],
): Classification {
  // Idêntico a um base → off-série inalterado, sem ação.
  const identical = candidates.find((c) => isIdentical(c, seriesRow));
  if (identical) {
    return { status: "SAME", matchBaseId: identical.id, reviewNote: "Idêntico ao existente (off-série)." };
  }

  const core = normalizeCore(nameOf(seriesRow));
  const coreMatches = candidates.filter((c) => normalizeCore(nameOf(c)) === core);

  if (coreMatches.length === 1) {
    return {
      status: "GREEN",
      matchBaseId: coreMatches[0].id,
      reviewNote: `Substitui "${nameOf(coreMatches[0])}" no mesmo horário.`,
    };
  }
  if (coreMatches.length > 1) {
    return {
      status: "YELLOW",
      matchBaseId: coreMatches[0].id,
      reviewNote: `${coreMatches.length} bases possíveis no mesmo horário — confirme qual substituir.`,
    };
  }
  return {
    status: "RED",
    reviewNote:
      candidates.length > 0
        ? "Sem base equivalente no horário — será criado como novo."
        : "Nenhum torneio nesse horário — será criado como novo.",
  };
}
