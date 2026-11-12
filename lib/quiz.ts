import type { Quiz, QuizQuestion, QuizReponse } from "./types";

/** 1 point par bonne réponse : 10 questions par semaine, ~25 quiz d'ici l'élection ≈ 250 pts. */
export const POINTS_QUESTION = 1;
export const QUIZ_TAILLE = 10;
export const QUIZ_PREVUS = 25;

export const quizOuvert = (q: Quiz, now = new Date()) => now >= new Date(q.ouverture) && now < new Date(q.cloture);
export const quizClos = (q: Quiz, now = new Date()) => now >= new Date(q.cloture);

export type Corrections = Record<string, string>;

/** Points d'un joueur sur un quiz (questions auxquelles la correction est connue). */
export function scoreQuiz(questions: QuizQuestion[], corrections: Corrections, reponses: QuizReponse[], userId: string) {
  let bons = 0, joues = 0;
  for (const q of questions) {
    const r = reponses.find((x) => x.question_id === q.id && x.user_id === userId);
    if (!r) continue;
    joues++;
    if (corrections[q.id] != null && corrections[q.id] === r.choix) bons++;
  }
  return { bons, joues, points: bons * POINTS_QUESTION };
}

/** Grille à partager façon Wordle : 🟩 bon, 🟥 raté, ⬜ pas répondu. */
export function grille(questions: QuizQuestion[], corrections: Corrections, reponses: QuizReponse[], userId: string) {
  return [...questions].sort((a, b) => a.ordre - b.ordre).map((q) => {
    const r = reponses.find((x) => x.question_id === q.id && x.user_id === userId);
    if (!r) return "⬜";
    return corrections[q.id] === r.choix ? "🟩" : "🟥";
  }).join("");
}

/** Série en cours : nombre de quiz consécutifs (du plus récent au plus ancien) où le joueur a tout joué. */
export function serie(quizzes: Quiz[], questions: QuizQuestion[], reponses: QuizReponse[], userId: string, now = new Date()) {
  const passes = [...quizzes].filter((q) => now >= new Date(q.ouverture)).sort((a, b) => +new Date(b.ouverture) - +new Date(a.ouverture));
  let n = 0;
  for (const [i, z] of passes.entries()) {
    const qs = questions.filter((q) => q.quiz_id === z.id);
    const done = qs.length > 0 && qs.every((q) => reponses.some((r) => r.question_id === q.id && r.user_id === userId));
    if (done) n++;
    else if (i === 0 && !quizClos(z, now)) continue; // le quiz en cours ne casse pas la série
    else break;
  }
  return n;
}
