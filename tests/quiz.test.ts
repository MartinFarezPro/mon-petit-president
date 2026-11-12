import { describe, expect, it } from "vitest";
import { grille, scoreQuiz, serie } from "../lib/quiz";
import type { Quiz, QuizQuestion, QuizReponse } from "../lib/types";

const z = (id: string, o: string, c: string): Quiz => ({ id, titre: id, ouverture: o, cloture: c });
const q = (id: string, quiz_id: string, ordre = 0): QuizQuestion => ({ id, quiz_id, ordre, citation: "", contexte: "", date_citation: null, choix: ["a", "b"] });
const r = (question_id: string, choix: string, user_id = "u"): QuizReponse => ({ question_id, user_id, choix, created_at: "" });

describe("quiz", () => {
  const qs = [q("1", "z", 0), q("2", "z", 1), q("3", "z", 2)];
  const corr = { 1: "a", 2: "b", 3: "a" };

  it("score et grille à partager", () => {
    const reps = [r("1", "a"), r("2", "a")];
    expect(scoreQuiz(qs, corr, reps, "u")).toEqual({ bons: 1, joues: 2, points: 1 });
    expect(grille(qs, corr, reps, "u")).toBe("🟩🟥⬜");
  });

  it("série : quiz joués d'affilée, le quiz en cours ne la casse pas", () => {
    const quizzes = [
      z("s1", "2027-01-04T08:00:00Z", "2027-01-10T22:00:00Z"),
      z("s2", "2027-01-11T08:00:00Z", "2027-01-17T22:00:00Z"),
      z("s3", "2027-01-18T08:00:00Z", "2027-01-24T22:00:00Z"),
    ];
    const questions = [q("a", "s1"), q("b", "s2"), q("c", "s3")];
    const now = new Date("2027-01-20T12:00:00Z");
    expect(serie(quizzes, questions, [r("a", "a"), r("b", "a")], "u", now)).toBe(2);
    expect(serie(quizzes, questions, [r("a", "a"), r("b", "a"), r("c", "b")], "u", now)).toBe(3);
    expect(serie(quizzes, questions, [r("a", "a"), r("c", "b")], "u", now)).toBe(1);
  });
});
