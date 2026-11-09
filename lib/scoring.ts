import { FAVORIS } from "./constants";
import type { Answer, FinalPick, Matchday, Question, Results } from "./types";

export const round1 = (x: number) => Math.round(x * 10) / 10;

export type ScorePart = { label: string; points: number };
export type ScoreBreakdown = { total: number; parts: ScorePart[] };

type PickLike = Pick<
  FinalPick,
  "q1" | "q2" | "gagnant" | "score_gagnant" | "scores" | "capitaine" | "surprise" | "participation"
>;

/** Classement du 1er tour à partir des résultats officiels (ids triés par score décroissant). */
export function firstRoundRanking(results: Pick<Results, "scores">): string[] {
  return Object.entries(results.scores ?? {})
    .filter(([, v]) => typeof v === "number" && !Number.isNaN(v))
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/**
 * Barème du prono final (cf. brief §4).
 * Les points de chaque élément sont arrondis à 0,1 ; un élément à 0 n'apparaît pas dans le détail.
 */
export function scoreFinalPick(pick: PickLike, results: Results | null): ScoreBreakdown {
  const parts: ScorePart[] = [];
  if (!results) return { total: 0, parts };
  const add = (label: string, v: number) => {
    const p = round1(v);
    if (p > 0) parts.push({ label, points: p });
  };

  const rs = results.scores ?? {};
  const ranking = firstRoundRanking(results);

  if (ranking.length >= 2) {
    const top = [ranking[0], ranking[1]];
    const found = [pick.q1, pick.q2].filter((x) => x && top.includes(x)).length;
    add("Qualifiés", found * 25);
    if (pick.q1 === top[0] && pick.q2 === top[1]) add("Bon ordre", 10);

    let sc = 0;
    for (const [id, real] of Object.entries(rs)) {
      const guess = pick.scores?.[id];
      if (guess == null || real == null) continue;
      let v = Math.max(0, 10 - 2 * Math.abs(guess - real));
      if (pick.capitaine === id) v *= 2;
      sc += v;
    }
    add("Scores 1er tour", sc);

    const surprise = ranking.find((id) => !(FAVORIS as readonly string[]).includes(id));
    if (surprise && pick.surprise === surprise) add("Surprise", 15);
  }

  if (results.participation != null && pick.participation != null) {
    add("Participation", Math.max(0, 15 - 3 * Math.abs(pick.participation - results.participation)));
  }

  if (results.gagnant) {
    if (pick.gagnant === results.gagnant) add("Vainqueur", 40);
    if (results.score_gagnant != null && pick.score_gagnant != null) {
      add("Score du vainqueur", Math.max(0, 20 - 2 * Math.abs(pick.score_gagnant - results.score_gagnant)));
    }
  }

  return { total: round1(parts.reduce((a, p) => a + p.points, 0)), parts };
}

export function hasResults(r: Results | null): r is Results {
  return !!r && (Object.keys(r.scores ?? {}).length > 0 || !!r.gagnant || r.participation != null);
}

/** Clôture effective d'une question (sa propre date, sinon celle de la journée). */
export function questionCloture(q: Question, md: Matchday): Date {
  return new Date(q.cloture ?? md.cloture);
}

export function isQuestionScored(q: Question) {
  return q.bonne_reponse !== null && q.bonne_reponse !== undefined;
}

/** Points d'une réponse à une question de journée. */
export function scoreAnswer(q: Question, reponse: string | number | null | undefined): number {
  if (!isQuestionScored(q) || reponse == null || reponse === "") return 0;
  if (q.type === "choix") {
    const good = Array.isArray(q.bonne_reponse) ? q.bonne_reponse : [String(q.bonne_reponse)];
    return good.includes(String(reponse)) ? round1(q.points) : 0;
  }
  const real = Number(q.bonne_reponse);
  const guess = Number(reponse);
  if (Number.isNaN(real) || Number.isNaN(guess)) return 0;
  const tol = Math.max(0, Number(q.options?.tolerance ?? 0));
  const ecart = Math.abs(guess - real);
  if (tol === 0) return ecart < 1e-9 ? round1(q.points) : 0;
  return round1(q.points * Math.max(0, 1 - ecart / tol));
}

export type PlayerStanding = {
  userId: string;
  total: number;
  final: ScoreBreakdown;
  finalCounted: boolean;
  byMatchday: Record<string, number>;
  answeredClosed: number;
};

export type StandingsInput = {
  memberIds: string[];
  picks: FinalPick[];
  results: Results | null;
  locked: boolean;
  matchdays: Matchday[];
  questions: Question[];
  answers: Answer[];
  now?: Date;
};

/** Classement général + points par journée. Seules les questions closes et corrigées comptent. */
export function computeStandings(input: StandingsInput): PlayerStanding[] {
  const now = input.now ?? new Date();
  const mdById = new Map(input.matchdays.map((m) => [m.id, m]));
  const closedQuestions = input.questions.filter((q) => {
    const md = mdById.get(q.matchday_id);
    return md && questionCloture(q, md).getTime() <= now.getTime();
  });
  const qById = new Map(closedQuestions.map((q) => [q.id, q]));
  const resultsReady = input.locked && hasResults(input.results);

  const rows: PlayerStanding[] = input.memberIds.map((userId) => {
    const pick = input.picks.find((p) => p.user_id === userId);
    const final = pick && resultsReady ? scoreFinalPick(pick, input.results) : { total: 0, parts: [] };
    const byMatchday: Record<string, number> = {};
    for (const m of input.matchdays) byMatchday[m.id] = 0;
    let answeredClosed = 0;
    for (const a of input.answers) {
      if (a.user_id !== userId) continue;
      const q = qById.get(a.question_id);
      if (!q) continue;
      answeredClosed++;
      byMatchday[q.matchday_id] = round1((byMatchday[q.matchday_id] ?? 0) + scoreAnswer(q, a.reponse));
    }
    const mdTotal = Object.values(byMatchday).reduce((a, b) => a + b, 0);
    return {
      userId,
      final,
      finalCounted: resultsReady && !!pick,
      byMatchday,
      answeredClosed,
      total: round1(final.total + mdTotal),
    };
  });

  return rows.sort((a, b) => b.total - a.total);
}

/** Rangs avec ex æquo (1, 2, 2, 4…). */
export function ranks(totals: number[]): number[] {
  return totals.map((t) => 1 + totals.filter((o) => o > t).length);
}
