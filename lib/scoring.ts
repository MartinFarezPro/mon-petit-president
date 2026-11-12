import { FAVORIS } from "./constants";
import { compte, PARIS, POINTS_PARI, scorePari, trancher, type Faits, type Verdict } from "./paris";
import { POINTS_QUESTION, quizClos, scoreQuiz, type Corrections } from "./quiz";
import type { FinalPick, PariReponse, Quiz, QuizQuestion, QuizReponse, Results } from "./types";

export const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Le score parfait de la saison fait 1000 pts :
 * prono final 400 (40 %), paris 350 (35 %), quiz ~250 (25 %, 1 pt par bonne réponse).
 */
export const BAREME = {
  prono: 400,
  qualifie: 50,
  ordre: 20,
  scores: 100,
  surprise: 30,
  participation: 30,
  vainqueur: 80,
  scoreVainqueur: 40,
} as const;

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
 * Barème du prono final, sur 400 pts.
 * Scores du 1er tour : 100 pts partagés entre les candidats (le capitaine compte double),
 * chaque part baisse de 20 % par point d'écart.
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
    add("Qualifiés", found * BAREME.qualifie);
    if (pick.q1 === top[0] && pick.q2 === top[1]) add("Bon ordre", BAREME.ordre);

    const part = BAREME.scores / (ranking.length + 1);
    let sc = 0;
    for (const [id, real] of Object.entries(rs)) {
      const guess = pick.scores?.[id];
      if (guess == null || real == null) continue;
      let v = part * Math.max(0, 1 - Math.abs(guess - real) / 5);
      if (pick.capitaine === id) v *= 2;
      sc += v;
    }
    add("Scores 1er tour", sc);

    const surprise = ranking.find((id) => !(FAVORIS as readonly string[]).includes(id));
    if (surprise && pick.surprise === surprise) add("Surprise", BAREME.surprise);
  }

  if (results.participation != null && pick.participation != null) {
    add("Participation", Math.max(0, BAREME.participation - 6 * Math.abs(pick.participation - results.participation)));
  }

  if (results.gagnant) {
    if (pick.gagnant === results.gagnant) add("Vainqueur", BAREME.vainqueur);
    if (results.score_gagnant != null && pick.score_gagnant != null) {
      add("Score du vainqueur", Math.max(0, BAREME.scoreVainqueur - 4 * Math.abs(pick.score_gagnant - results.score_gagnant)));
    }
  }

  return { total: round1(parts.reduce((a, p) => a + p.points, 0)), parts };
}

export function hasResults(r: Results | null): r is Results {
  return !!r && (Object.keys(r.scores ?? {}).length > 0 || !!r.gagnant || r.participation != null);
}

/** Le prono final est entièrement tranché (vainqueur connu). */
export function pronoComplet(r: Results | null) {
  return !!r?.gagnant && firstRoundRanking(r).length >= 2;
}

export type PlayerStanding = {
  userId: string;
  total: number;
  final: ScoreBreakdown;
  finalCounted: boolean;
  paris: number;
  parisDetail: Record<string, number>;
  quiz: number;
  quizDetail: Record<string, number>;
};

export type StandingsInput = {
  memberIds: string[];
  picks: FinalPick[];
  results: Results | null;
  locked: boolean;
  faits: Faits;
  parisReponses: PariReponse[];
  quizzes: Quiz[];
  quizQuestions: QuizQuestion[];
  quizReponses: QuizReponse[];
  corrections: Corrections;
  now?: Date;
};

/** Verdicts de tous les paris (null = pas encore tranché). */
export function verdicts(faits: Faits, now = new Date()): Record<string, Verdict | null> {
  return Object.fromEntries(PARIS.map((p) => [p.id, trancher(p, faits, now)]));
}

/** Classement général : prono final + paris clos et tranchés + quiz clos. */
export function computeStandings(input: StandingsInput): PlayerStanding[] {
  const now = input.now ?? new Date();
  const resultsReady = input.locked && hasResults(input.results);
  const vs = verdicts(input.faits, now);
  const closedQuizzes = input.quizzes.filter((z) => quizClos(z, now));

  const rows: PlayerStanding[] = input.memberIds.map((userId) => {
    const pick = input.picks.find((p) => p.user_id === userId);
    const final = pick && resultsReady ? scoreFinalPick(pick, input.results) : { total: 0, parts: [] };

    const parisDetail: Record<string, number> = {};
    for (const p of PARIS) {
      const rep = input.parisReponses.find((r) => r.user_id === userId && r.pari_id === p.id);
      const s = scorePari(p, vs[p.id], rep, now);
      if (s) parisDetail[p.id] = s.points;
    }
    const paris = round1(Object.values(parisDetail).reduce((a, b) => a + b, 0));

    const quizDetail: Record<string, number> = {};
    for (const z of closedQuizzes) {
      const qs = input.quizQuestions.filter((q) => q.quiz_id === z.id);
      quizDetail[z.id] = scoreQuiz(qs, input.corrections, input.quizReponses, userId).points;
    }
    const quiz = round1(Object.values(quizDetail).reduce((a, b) => a + b, 0));

    return {
      userId, final, finalCounted: resultsReady && !!pick, paris, parisDetail, quiz, quizDetail,
      total: round1(final.total + paris + quiz),
    };
  });

  return rows.sort((a, b) => b.total - a.total);
}

/** Score parfait atteignable à ce jour (ce qui a déjà été tranché). */
export function maxSoFar(input: Pick<StandingsInput, "results" | "locked" | "faits" | "quizzes" | "quizQuestions" | "now">) {
  const now = input.now ?? new Date();
  const vs = verdicts(input.faits, now);
  const paris = PARIS.filter((p) => compte(p, vs[p.id], now)).length * POINTS_PARI;
  const closed = new Set(input.quizzes.filter((z) => quizClos(z, now)).map((z) => z.id));
  const quiz = input.quizQuestions.filter((q) => closed.has(q.quiz_id)).length * POINTS_QUESTION;
  const prono = input.locked && pronoComplet(input.results) ? BAREME.prono : 0;
  return { prono, paris, quiz, total: prono + paris + quiz };
}

/** Rangs avec ex æquo (1, 2, 2, 4…). */
export function ranks(totals: number[]): number[] {
  return totals.map((t) => 1 + totals.filter((o) => o > t).length);
}
