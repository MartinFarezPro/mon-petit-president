import { describe, expect, it } from "vitest";
import {
  answerDuel, baseOrder, capFor, finishDuels, gridRanking, currentDuel, duelsDone, leaderShare, normalizeRanking, orderErrors,
  orderFromScores, rankedValues, startDuels, surpriseFrom, type DuelState,
} from "../lib/ranking";

/** Joue tous les duels avec un « vrai » classement en tête. */
function play(order: string[], truth: string[]) {
  let s: DuelState = startDuels(order);
  let guard = 0;
  while (!duelsDone(s) && guard++ < 1000) {
    const [above, challenger] = currentDuel(s)!;
    s = answerDuel(s, truth.indexOf(challenger) < truth.indexOf(above));
  }
  return s;
}

describe("duels", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];

  it("retrouve n'importe quel classement", () => {
    for (const truth of [ids, [...ids].reverse(), ["c", "a", "f", "b", "e", "d"]]) {
      expect(play(ids, truth).sorted).toEqual(truth);
    }
  });

  it("ne pose que n-1 duels si le joueur suit l'ordre de départ", () => {
    expect(play(ids, ids).played).toBe(ids.length - 1);
  });

  it("s'arrête au plafond de duels avec un classement complet", () => {
    const many = Array.from({ length: 17 }, (_, i) => `c${i}`);
    let s: DuelState = startDuels(many);
    while (!duelsDone(s)) s = answerDuel(s, true, 40); // le joueur renverse tout : sans plafond, 136 duels
    expect(s.played).toBe(40);
    expect([...s.sorted].sort()).toEqual([...many].sort());
  });

  it("finishDuels garde le candidat en cours là où il est arrivé", () => {
    let s = startDuels(["a", "b", "c", "d"]);
    s = answerDuel(s, false); // b sous a
    s = answerDuel(s, true); // c passe devant b
    expect(finishDuels(s).sorted).toEqual(["a", "c", "b", "d"]);
  });

  it("mode grille : top touché puis ordre de départ", () => {
    expect(gridRanking(["d", "b", "d", "zz"], ["a", "b", "c", "d"])).toEqual(["d", "b", "a", "c"]);
  });

  it("un seul candidat : rien à jouer", () => {
    const s = startDuels(["a"]);
    expect(duelsDone(s)).toBe(true);
    expect(s.sorted).toEqual(["a"]);
  });

  it("ordre de départ : sondages puis candidats sans sondage", () => {
    expect(baseOrder(["x", "y", "z", "w"], { y: 30, w: 10 })).toEqual(["y", "w", "x", "z"]);
  });

  it("reprend un ancien prono à partir des scores", () => {
    expect(orderFromScores(["a", "b", "c"], { c: 40, a: 20 })).toEqual(["c", "a", "b"]);
  });

  it("garde le classement à jour quand des candidats arrivent ou partent", () => {
    expect(normalizeRanking(["b", "zz", "a", "b"], ["a", "b", "c"])).toEqual(["b", "a", "c"]);
  });
});

describe("pourcentages", () => {
  const ranking = ["a", "b", "c"];

  it("le 1er a 100 % puis perd ce qu'on donne aux autres", () => {
    expect(leaderShare(ranking, {})).toBe(100);
    expect(leaderShare(ranking, { b: "30", c: "12,5" })).toBe(57.5);
  });

  it("plafonne chaque saisie pour ne jamais dépasser 100 %", () => {
    expect(capFor(ranking, { b: "70", c: "10" }, "c")).toBe(30);
  });

  it("signale un candidat plus haut que celui du dessus, sans changer l'ordre", () => {
    expect(orderErrors(rankedValues(ranking, { b: "20", c: "25" }))).toEqual([2]);
    expect(orderErrors(rankedValues(ranking, { b: "60" }))).toEqual([1]);
    expect(orderErrors(rankedValues(ranking, { b: "30", c: "30" }))).toEqual([]);
  });

  it("surprise = mieux classé hors favoris", () => {
    expect(surpriseFrom(["lepen", "philippe", "retailleau", "melenchon"])).toBe("retailleau");
  });
});
