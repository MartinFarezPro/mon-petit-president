import { describe, expect, it } from "vitest";
import { computeBadges } from "../lib/badges";
import { computeStandings, ranks, scoreAnswer, scoreFinalPick } from "../lib/scoring";
import type { FinalPick, Matchday, Question, Results } from "../lib/types";

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

describe("prono final", () => {
  it("rien sans résultats", () => {
    expect(scoreFinalPick({ ...basePick, q1: "lepen" }, null).total).toBe(0);
  });

  it("prono parfait", () => {
    const s = scoreFinalPick(
      {
        q1: "lepen", q2: "philippe", gagnant: "philippe", score_gagnant: 54,
        scores: { lepen: 33, philippe: 18 }, capitaine: "lepen", surprise: "retailleau", participation: 72,
      },
      results,
    );
    // 50 qualifiés + 10 ordre + 40 vainqueur + 20 score + (20 capitaine + 10) scores + 15 participation + 15 surprise
    expect(s.total).toBe(180);
    expect(s.parts.map((p) => p.label)).toEqual([
      "Qualifiés", "Bon ordre", "Scores 1er tour", "Surprise", "Participation", "Vainqueur", "Score du vainqueur",
    ]);
  });

  it("qualifiés dans le désordre : pas de bonus d'ordre", () => {
    const s = scoreFinalPick({ ...basePick, q1: "philippe", q2: "lepen" }, results);
    expect(s.total).toBe(50);
  });

  it("écarts et planchers à 0", () => {
    const s = scoreFinalPick(
      { ...basePick, scores: { lepen: 30.5, melenchon: 30 }, participation: 75.5, gagnant: "lepen", score_gagnant: 51 },
      { ...results, gagnant: "lepen", score_gagnant: 52.3 },
    );
    // lepen : 10 − 2×2,5 = 5 ; melenchon : écart 14 → 0 ; participation : 15 − 3×3,5 = 4,5 ;
    // vainqueur 40 ; score : 20 − 2×1,3 = 17,4
    expect(s.parts).toEqual([
      { label: "Scores 1er tour", points: 5 },
      { label: "Participation", points: 4.5 },
      { label: "Vainqueur", points: 40 },
      { label: "Score du vainqueur", points: 17.4 },
    ]);
    expect(s.total).toBe(66.9);
  });

  it("le capitaine double ses points de score", () => {
    const a = scoreFinalPick({ ...basePick, scores: { attal: 6 } }, results).total;
    const b = scoreFinalPick({ ...basePick, scores: { attal: 6 }, capitaine: "attal" }, results).total;
    expect(a).toBe(8);
    expect(b).toBe(16);
  });

  it("surprise = mieux classé hors des 4 favoris", () => {
    expect(scoreFinalPick({ ...basePick, surprise: "retailleau" }, results).total).toBe(15);
    expect(scoreFinalPick({ ...basePick, surprise: "attal" }, results).total).toBe(0);
  });
});

const q = (over: Partial<Question>): Question => ({
  id: "q", matchday_id: "m", intitule: "?", type: "choix", options: {}, points: 10,
  cloture: null, bonne_reponse: null, ordre: 0, ...over,
});

describe("questions de journée", () => {
  it("choix : une ou plusieurs bonnes réponses", () => {
    expect(scoreAnswer(q({ bonne_reponse: ["A"] }), "A")).toBe(10);
    expect(scoreAnswer(q({ bonne_reponse: ["A", "B"] }), "B")).toBe(10);
    expect(scoreAnswer(q({ bonne_reponse: ["A"] }), "C")).toBe(0);
    expect(scoreAnswer(q({ bonne_reponse: null }), "A")).toBe(0);
  });

  it("nombre : dégressif selon la tolérance", () => {
    const n = q({ type: "nombre", options: { tolerance: 4 }, bonne_reponse: 20 });
    expect(scoreAnswer(n, 20)).toBe(10);
    expect(scoreAnswer(n, 21)).toBe(7.5);
    expect(scoreAnswer(n, 25)).toBe(0);
    expect(scoreAnswer(q({ type: "nombre", bonne_reponse: 3 }), 3)).toBe(10);
    expect(scoreAnswer(q({ type: "nombre", bonne_reponse: 3 }), 3.1)).toBe(0);
  });
});

describe("classement", () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const matchdays: Matchday[] = [
    { id: "m1", league_id: "l", titre: "J1", ouverture: "2026-11-10T00:00:00Z", cloture: "2026-11-15T00:00:00Z" },
    { id: "m2", league_id: "l", titre: "J2", ouverture: "2026-11-20T00:00:00Z", cloture: "2026-12-10T00:00:00Z" },
  ];
  const questions: Question[] = [
    q({ id: "a", matchday_id: "m1", bonne_reponse: ["X"] }),
    q({ id: "b", matchday_id: "m1", bonne_reponse: ["Y"], points: 5 }),
    q({ id: "c", matchday_id: "m2", bonne_reponse: ["Z"] }),
  ];
  const answers = [
    { question_id: "a", user_id: "u1", reponse: "X", updated_at: "" },
    { question_id: "b", user_id: "u1", reponse: "Y", updated_at: "" },
    { question_id: "a", user_id: "u2", reponse: "X", updated_at: "" },
    { question_id: "c", user_id: "u2", reponse: "Z", updated_at: "" }, // journée pas encore close
  ];
  const picks: FinalPick[] = [
    { ...basePick, user_id: "u3", league_id: "l", capitaine: "attal", scores: {}, updated_at: "" },
  ];

  it("ne compte que les journées closes", () => {
    const st = computeStandings({
      memberIds: ["u1", "u2", "u3"], picks, results: null, locked: false, matchdays, questions, answers, now,
    });
    expect(st.map((s) => [s.userId, s.total])).toEqual([["u1", 15], ["u2", 10], ["u3", 0]]);
    expect(st[0].byMatchday).toEqual({ m1: 15, m2: 0 });
  });

  it("ajoute le prono final après clôture et résultats", () => {
    const st = computeStandings({
      memberIds: ["u3"], picks: [{ ...picks[0], q1: "lepen" }], results, locked: true,
      matchdays, questions, answers, now,
    });
    expect(st[0].total).toBe(25);
    expect(st[0].finalCounted).toBe(true);
  });

  it("rangs ex æquo", () => {
    expect(ranks([30, 20, 20, 5])).toEqual([1, 2, 2, 4]);
  });

  it("badges", () => {
    const standings = computeStandings({
      memberIds: ["u1", "u2", "u3"], picks, results: null, locked: true, matchdays, questions, answers, now,
    });
    const b = computeBadges({ standings, matchdays, questions, picks, locked: true, now });
    expect(b.u1.map((x) => x.id)).toEqual(["leader", "nostradamus", "sansfaute", "assidu"]);
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
