import { describe, expect, it } from "vitest";
import { computeBadges } from "../lib/badges";
import { computeStandings, maxSoFar, ranks, scoreFinalPick } from "../lib/scoring";
import type { Candidate, FinalPick, PariReponse, Poll, Quiz, QuizQuestion, QuizReponse, Results } from "../lib/types";

const results: Results = {
  scores: { lepen: 33, philippe: 18, melenchon: 16, glucksmann: 12, retailleau: 7, attal: 5 },
  participation: 72,
  gagnant: "philippe",
  score_gagnant: 54,
};

const basePick = {
  q1: null, q2: null, gagnant: null, score_gagnant: null, scores: {},
  capitaine: null, surprise: null, participation: null,
} as const;

// 6 candidats au 1er tour : 100 pts de scores répartis en 7 parts (le capitaine compte double)
const PART = 100 / 7;

describe("prono final (sur 400)", () => {
  it("rien sans résultats", () => {
    expect(scoreFinalPick({ ...basePick, q1: "lepen" }, null).total).toBe(0);
  });

  it("prono parfait = 400", () => {
    const s = scoreFinalPick(
      {
        q1: "lepen", q2: "philippe", gagnant: "philippe", score_gagnant: 54,
        scores: { ...results.scores }, capitaine: "lepen", surprise: "retailleau", participation: 72,
      },
      results,
    );
    expect(s.total).toBe(400);
    expect(s.parts.map((p) => p.label)).toEqual([
      "Qualifiés", "Bon ordre", "Scores 1er tour", "Surprise", "Participation", "Vainqueur", "Score du vainqueur",
    ]);
  });

  it("qualifiés dans le désordre : pas de bonus d'ordre", () => {
    expect(scoreFinalPick({ ...basePick, q1: "philippe", q2: "lepen" }, results).total).toBe(100);
  });

  it("écarts et planchers à 0", () => {
    const s = scoreFinalPick(
      { ...basePick, scores: { lepen: 30.5, melenchon: 30 }, participation: 75.5, gagnant: "lepen", score_gagnant: 51 },
      { ...results, gagnant: "lepen", score_gagnant: 52.3 },
    );
    // lepen : une part × (1 − 2,5/5) ; melenchon : écart 14 → 0 ; participation : 30 − 6×3,5 = 9 ;
    // vainqueur 80 ; score : 40 − 4×1,3 = 34,8
    expect(s.parts).toEqual([
      { label: "Scores 1er tour", points: Math.round(PART * 0.5 * 10) / 10 },
      { label: "Participation", points: 9 },
      { label: "Vainqueur", points: 80 },
      { label: "Score du vainqueur", points: 34.8 },
    ]);
  });

  it("le capitaine double ses points de score", () => {
    const a = scoreFinalPick({ ...basePick, scores: { attal: 6 } }, results).total;
    const b = scoreFinalPick({ ...basePick, scores: { attal: 6 }, capitaine: "attal" }, results).total;
    expect(a).toBe(Math.round(PART * 0.8 * 10) / 10);
    expect(b).toBe(Math.round(PART * 1.6 * 10) / 10);
  });

  it("surprise = mieux classé hors des 4 favoris", () => {
    expect(scoreFinalPick({ ...basePick, surprise: "retailleau" }, results).total).toBe(30);
    expect(scoreFinalPick({ ...basePick, surprise: "attal" }, results).total).toBe(0);
  });
});

describe("classement de la saison", () => {
  const now = new Date("2027-03-05T12:00:00+01:00");
  const cand = (id: string): Candidate => ({ id, nom: id, parti: "", couleur: "#000000", actif: true, ordre: 1, photo: null });
  const polls: Poll[] = [
    { id: 1, date: "2026-12-28", source: "", url: null, valeurs: { lepen: 34, ruffin: 3, philippe: 13, melenchon: 17 } },
    { id: 2, date: "2027-02-22", source: "", url: null, valeurs: { lepen: 33, ruffin: 6, philippe: 14, melenchon: 16 } },
  ];
  const faits = { polls, parrainages: [], results: null, candidates: ["lepen", "ruffin", "philippe", "melenchon"].map(cand) };
  const tot = "2026-11-12T00:00:00+01:00";
  const parisReponses: PariReponse[] = [
    { user_id: "u1", pari_id: "sondage_progression", reponse: ["ruffin"], updated_at: tot },
    { user_id: "u2", pari_id: "sondage_progression", reponse: ["ruffin"], updated_at: "2026-12-31T23:59:59+01:00" },
    { user_id: "u2", pari_id: "sondage_podium", reponse: ["philippe"], updated_at: tot },
    { user_id: "u3", pari_id: "sondage_podium", reponse: ["lepen"], updated_at: tot },
  ];
  const quizzes: Quiz[] = [
    { id: "z1", titre: "S1", ouverture: "2027-02-20T08:00:00+01:00", cloture: "2027-02-27T23:59:00+01:00" },
    { id: "z2", titre: "S2", ouverture: "2027-03-01T08:00:00+01:00", cloture: "2027-03-08T23:59:00+01:00" },
  ];
  const qq = (id: string, quiz_id: string, ordre: number): QuizQuestion => ({ id, quiz_id, ordre, citation: "…", contexte: "", date_citation: null, choix: ["a", "b", "c"] });
  const quizQuestions = [qq("q1", "z1", 0), qq("q2", "z1", 1), qq("q3", "z2", 0)];
  const rep = (question_id: string, user_id: string, choix: string): QuizReponse => ({ question_id, user_id, choix, created_at: "" });
  const quizReponses = [rep("q1", "u1", "a"), rep("q2", "u1", "b"), rep("q1", "u2", "a"), rep("q2", "u2", "c"), rep("q3", "u2", "c")];
  const corrections = { q1: "a", q2: "b", q3: "c" };
  const picks: FinalPick[] = [
    { ...basePick, user_id: "u3", league_id: "l", capitaine: "attal", scores: {}, classement: [], updated_at: "" },
  ];
  const input = {
    memberIds: ["u1", "u2", "u3"], picks, results: null, locked: false, faits, parisReponses,
    quizzes, quizQuestions, quizReponses, corrections, now,
  };

  it("paris tranchés (avec précocité) + quiz clos uniquement", () => {
    const st = computeStandings(input);
    // u2 : progression à la dernière seconde (25 × 80 %) + podium (25) + 1 bonne réponse au quiz clos
    expect(st.map((s) => [s.userId, s.paris, s.quiz, s.total])).toEqual([["u2", 45, 1, 46], ["u1", 25, 2, 27], ["u3", 0, 0, 0]]);
    expect(st[0].parisDetail).toEqual({ sondage_progression: 20, sondage_podium: 25 });
  });

  it("score parfait à ce jour", () => {
    expect(maxSoFar(input)).toEqual({ prono: 0, paris: 50, quiz: 2, total: 52 });
  });

  it("ajoute le prono final après clôture et résultats", () => {
    const st = computeStandings({ ...input, memberIds: ["u3"], picks: [{ ...picks[0], q1: "lepen" }], results, locked: true });
    expect(st[0].final.total).toBe(50);
    expect(st[0].finalCounted).toBe(true);
  });

  it("rangs ex æquo", () => {
    expect(ranks([30, 20, 20, 5])).toEqual([1, 2, 2, 4]);
  });

  it("badges", () => {
    const standings = computeStandings({ ...input, locked: true });
    const b = computeBadges({ standings, quizzes, quizQuestions, quizReponses, picks, locked: true, now });
    expect(b.u1.map((x) => x.id)).toEqual(["sansfaute", "flair"]);
    expect(b.u2.map((x) => x.id)).toEqual(["leader", "flair"]);
    expect(b.u3.map((x) => x.id)).toEqual(["lanterne", "boulet", "kamikaze"]);
  });
});

import { isoToParisLocal, parisLocalToISO } from "../lib/format";
describe("heure de Paris", () => {
  it("hiver (UTC+1) et été (UTC+2)", () => {
    expect(parisLocalToISO("2026-11-15T20:00")).toBe("2026-11-15T19:00:00.000Z");
    expect(parisLocalToISO("2027-04-17T23:59")).toBe("2027-04-17T21:59:00.000Z");
    expect(isoToParisLocal("2026-11-15T19:00:00Z")).toBe("2026-11-15T20:00");
  });
});
