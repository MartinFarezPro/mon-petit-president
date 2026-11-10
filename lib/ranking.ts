import { FAVORIS } from "./constants";

/**
 * Classement du 1er tour par duels.
 * On part de l'ordre des sondages et on insère chaque candidat en le faisant remonter duel par duel
 * (tri par insertion) : si le joueur suit à peu près les sondages, il n'y a qu'une vingtaine de duels.
 */

/** Ordre de départ : sondage décroissant, puis les candidats sans sondage dans leur ordre d'affichage. */
export function baseOrder(ids: string[], poll: Record<string, number>): string[] {
  const idx = new Map(ids.map((id, i) => [id, i]));
  return [...ids].sort((a, b) => {
    const pa = poll[a], pb = poll[b];
    if (pa != null && pb != null && pa !== pb) return pb - pa;
    if (pa != null && pb == null) return -1;
    if (pa == null && pb != null) return 1;
    return idx.get(a)! - idx.get(b)!;
  });
}

export type DuelState = {
  /** Candidats déjà classés, du 1er au dernier. */
  sorted: string[];
  /** Candidats pas encore classés. */
  pending: string[];
  /** Candidat en cours d'insertion (null quand tout est classé). */
  cur: string | null;
  /** Position visée pour `cur` : il affronte sorted[pos - 1]. */
  pos: number;
  /** Nombre de duels déjà joués. */
  played: number;
};

function next(sorted: string[], pending: string[], played: number): DuelState {
  const [cur = null, ...rest] = pending;
  return { sorted, pending: rest, cur, pos: sorted.length, played };
}

export function startDuels(order: string[]): DuelState {
  if (order.length === 0) return { sorted: [], pending: [], cur: null, pos: 0, played: 0 };
  return next([order[0]], order.slice(1), 0);
}

/** Le duel à jouer : [candidat déjà classé au-dessus, candidat qui monte], ou null si c'est fini. */
export function currentDuel(s: DuelState): [string, string] | null {
  return s.cur && s.pos > 0 ? [s.sorted[s.pos - 1], s.cur] : null;
}

/** Réponse au duel : `challengerWins` = le candidat qui monte fait plus de voix que celui au-dessus. */
export function answerDuel(s: DuelState, challengerWins: boolean): DuelState {
  if (!s.cur) return s;
  const played = s.played + 1;
  if (challengerWins && s.pos > 1) return { ...s, pos: s.pos - 1, played };
  const at = challengerWins ? 0 : s.pos;
  const sorted = [...s.sorted.slice(0, at), s.cur, ...s.sorted.slice(at)];
  return next(sorted, s.pending, played);
}

export function duelsDone(s: DuelState) {
  return s.cur === null;
}

/** Ordre déduit d'anciens scores (pronos déposés avant les duels). */
export function orderFromScores(base: string[], scores: Record<string, number>): string[] {
  const idx = new Map(base.map((id, i) => [id, i]));
  return [...base].sort((a, b) => (scores[b] ?? -1) - (scores[a] ?? -1) || idx.get(a)! - idx.get(b)!);
}

/** Garde un classement enregistré à jour avec la liste des candidats (retire les inconnus, ajoute les nouveaux en bas). */
export function normalizeRanking(saved: string[], ids: string[]): string[] {
  const known = new Set(ids);
  const kept = saved.filter((id, i) => known.has(id) && saved.indexOf(id) === i);
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

export const parsePct = (v: string | undefined) => {
  if (v == null || v.trim() === "") return 0;
  const x = parseFloat(v.replace(",", "."));
  return Number.isFinite(x) && x > 0 ? x : 0;
};
export const r1 = (x: number) => Math.round(x * 10) / 10;

/** Le 1er du classement prend tout ce qui n'est pas attribué aux autres (le total fait donc toujours 100 %). */
export function leaderShare(ranking: string[], vals: Record<string, string>): number {
  return r1(Math.max(0, 100 - ranking.slice(1).reduce((a, id) => a + parsePct(vals[id]), 0)));
}

/** Plafond d'une saisie pour ne jamais dépasser 100 % au total. */
export function capFor(ranking: string[], vals: Record<string, string>, id: string): number {
  return r1(Math.max(0, 100 - ranking.slice(1).filter((x) => x !== id).reduce((a, x) => a + parsePct(vals[x]), 0)));
}

/** Scores dans l'ordre du classement (1er = part restante). */
export function rankedValues(ranking: string[], vals: Record<string, string>): number[] {
  return ranking.map((id, i) => (i === 0 ? leaderShare(ranking, vals) : parsePct(vals[id])));
}

/** Indices des candidats qui ont un score plus élevé que celui classé juste au-dessus. */
export function orderErrors(values: number[]): number[] {
  return values.flatMap((v, i) => (i > 0 && v > values[i - 1] + 1e-9 ? [i] : []));
}

/** Bonus surprise : le mieux classé hors des 4 favoris des sondages. */
export function surpriseFrom(ranking: string[]): string | null {
  return ranking.find((id) => !(FAVORIS as readonly string[]).includes(id)) ?? null;
}
