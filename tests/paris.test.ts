import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  annule, compte, justesse, PARIS, PARIS_BY_ID, PARIS_TOTAL, precocite, scorePari, trancher, type Faits, type Verdict,
} from "../lib/paris";
import type { Candidate, Poll, Results } from "../lib/types";

const cand = (id: string): Candidate => ({ id, nom: `Prénom ${id}`, parti: "", couleur: "#000000", actif: true, ordre: 1, photo: null });
const ids = ["lepen", "melenchon", "philippe", "glucksmann", "ruffin", "lalanne"];
const base: Faits = { polls: [], parrainages: [], results: null, candidates: ids.map(cand) };
const P = PARIS_BY_ID;
const after = new Date("2027-06-01T12:00:00+02:00");

const t1: Results = {
  scores: { lepen: 31, philippe: 19, melenchon: 17.5, glucksmann: 11, ruffin: 4.5, lalanne: 0.8 },
  participation: 74, gagnant: "philippe", score_gagnant: 53, participation_t2: 76,
};

describe("catalogue", () => {
  it("14 paris, 350 pts", () => {
    expect(PARIS).toHaveLength(14);
    expect(PARIS_TOTAL).toBe(350);
  });

  it("dates identiques au code et à la migration SQL", () => {
    const sql = readFileSync(new URL("../supabase/migrations/20261112000000_paris_quiz.sql", import.meta.url), "utf8");
    const rows = [...sql.matchAll(/\('([a-z0-9_]+)',\s*'([^']+)',\s*'([^']+)'\)/g)];
    const iso = (s: string) => new Date(s.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).getTime();
    expect(rows.map((r) => r[1]).sort()).toEqual(PARIS.map((p) => p.id).sort());
    for (const [, id, o, c] of rows) {
      expect(iso(o), id).toBe(new Date(P[id].ouverture).getTime());
      expect(iso(c), id).toBe(new Date(P[id].cloture).getTime());
    }
  });

  it("rien n'est tranché sans données", () => {
    for (const p of PARIS) expect(trancher(p, base, after), p.id).toBeNull();
  });
});

describe("justesse", () => {
  const v = (bonnes: string[], enJeu: string[]): Verdict => ({ bonnes, enJeu, detail: "", le: "2027-04-18" });
  const enJeu = Array.from({ length: 14 }, (_, i) => `c${i}`);
  const vrais = enJeu.slice(0, 10);

  it("plusieurs candidats : tout cocher ou rien ne rapporte rien", () => {
    expect(justesse(P.sous5, v(vrais, enJeu), enJeu)).toBe(0);
    expect(justesse(P.sous5, v(vrais, enJeu), [])).toBe(0);
  });

  it("plusieurs candidats : part des bons − part des mauvais", () => {
    expect(justesse(P.sous5, v(vrais, enJeu), [...vrais.slice(0, 8), "c12"])).toBeCloseTo(0.8 - 0.25);
    expect(justesse(P.sous5, v(vrais, enJeu), vrais)).toBe(1);
  });

  it("« personne » quand la bonne réponse est personne", () => {
    expect(justesse(P.sous5, v([], ["a", "b"]), [])).toBe(1);
    expect(justesse(P.sous5, v([], ["a", "b"]), ["a"])).toBe(0.5);
  });

  it("un candidat hors jeu coché est ignoré", () => {
    expect(justesse(P.sous5, v(["a"], ["a", "b"]), ["a", "zz"])).toBe(1);
  });

  it("un seul choix : tout ou rien, ex æquo acceptés", () => {
    expect(justesse(P.troisieme, v(["a", "b"], []), ["b"])).toBe(1);
    expect(justesse(P.troisieme, v(["a"], []), ["b"])).toBe(0);
  });
});

describe("précocité", () => {
  const p = P.troisieme;
  it("100 % à l'ouverture, 80 % à la clôture, linéaire entre les deux", () => {
    expect(precocite(p, p.ouverture)).toBe(1);
    expect(precocite(p, p.cloture)).toBeCloseTo(0.8);
    expect(precocite(p, "2020-01-01")).toBe(1);
    const mid = new Date((+new Date(p.ouverture) + +new Date(p.cloture)) / 2);
    expect(precocite(p, mid)).toBeCloseTo(0.9);
  });
});

describe("résolution automatique", () => {
  const f: Faits = { ...base, results: t1 };

  it("1er tour", () => {
    expect(trancher(P.sous5, f, after)!.bonnes).toEqual(["ruffin", "lalanne"]);
    expect(trancher(P.troisieme, f, after)!.bonnes).toEqual(["melenchon"]);
    expect(trancher(P.plus10, f, after)!.bonnes).toEqual(["4"]);
    expect(trancher(P.ecart23, f, after)!.bonnes).toEqual(["moins2"]);
  });

  it("2nd tour", () => {
    expect(trancher(P.premier_elu, f, after)!.bonnes).toEqual(["non"]);
    expect(trancher(P.participation_t2, f, after)!.bonnes).toEqual(["plus"]);
    expect(trancher(P.premier_elu, { ...f, results: { ...t1, gagnant: null } }, after)).toBeNull();
  });

  it("sur- et sous-cotés : dernier sondage avant le 1er tour", () => {
    const polls: Poll[] = [
      { id: 1, date: "2027-04-12", source: "", url: null, valeurs: { lepen: 34, philippe: 16, melenchon: 17, ruffin: 5 } },
      { id: 2, date: "2027-04-19", source: "", url: null, valeurs: { lepen: 99 } }, // après le 1er tour : ignoré
    ];
    expect(trancher(P.surcote, { ...f, polls }, after)!.bonnes).toEqual(["lepen"]);
    expect(trancher(P.souscote, { ...f, polls }, after)!.bonnes).toEqual(["philippe"]);
  });

  it("parrainages : il faut le relevé définitif (12 mars)", () => {
    const early = [{ date: "2027-03-01", valeurs: { lepen: 700, lalanne: 20 } }];
    expect(trancher(P.p500_rates, { ...base, parrainages: early }, after)).toBeNull();
    const fin = [...early, { date: "2027-03-12", valeurs: { lepen: 900, melenchon: 650, philippe: 800, glucksmann: 510, ruffin: 499 } }];
    const v = trancher(P.p500_rates, { ...base, parrainages: fin }, after)!;
    expect(v.bonnes).toEqual(["ruffin", "lalanne"]);
    expect(trancher(P.p500_record, { ...base, parrainages: fin }, after)!.bonnes).toEqual(["lepen"]);
    expect(trancher(P.nb_candidats, { ...base, parrainages: fin }, after)!.bonnes).toEqual(["max9"]);
  });

  it("1er aux 500 : annulé si tranché avant la clôture du pari", () => {
    const tot = [{ date: "2027-01-20", valeurs: { lepen: 520 } }];
    const v = trancher(P.p500_premier, { ...base, parrainages: tot }, after)!;
    expect(annule(P.p500_premier, v)).toBe(true);
    expect(compte(P.p500_premier, v, after)).toBe(false);
    const ok = [{ date: "2027-02-05", valeurs: { lepen: 520, philippe: 530, ruffin: 100 } }];
    const v2 = trancher(P.p500_premier, { ...base, parrainages: ok }, after)!;
    expect(v2.bonnes).toEqual(["lepen", "philippe"]);
    expect(compte(P.p500_premier, v2, after)).toBe(true);
  });

  it("sondages au 1er mars", () => {
    const polls: Poll[] = [
      { id: 1, date: "2026-12-28", source: "", url: null, valeurs: { lepen: 34, ruffin: 3, philippe: 13, melenchon: 17 } },
      { id: 2, date: "2027-02-22", source: "", url: null, valeurs: { lepen: 33, ruffin: 6, philippe: 14, melenchon: 16 } },
    ];
    expect(trancher(P.sondage_progression, { ...base, polls }, after)!.bonnes).toEqual(["ruffin"]);
    expect(trancher(P.sondage_podium, { ...base, polls }, after)!.bonnes).toEqual(["philippe"]);
    expect(trancher(P.sondage_podium, { ...base, polls }, new Date("2027-02-25"))).toBeNull();
  });
});

describe("points", () => {
  const f: Faits = { ...base, results: t1 };
  it("rien avant la clôture, 0 sans pari, 25 × justesse × précocité sinon", () => {
    const v = trancher(P.troisieme, f, after);
    expect(scorePari(P.troisieme, v, { reponse: ["melenchon"], updated_at: P.troisieme.ouverture }, new Date("2027-04-10"))).toBeNull();
    expect(scorePari(P.troisieme, v, undefined, after)).toEqual({ points: 0, justesse: 0, precocite: 0 });
    expect(scorePari(P.troisieme, v, { reponse: ["melenchon"], updated_at: P.troisieme.ouverture }, after)!.points).toBe(25);
    expect(scorePari(P.troisieme, v, { reponse: ["melenchon"], updated_at: P.troisieme.cloture }, after)!.points).toBe(20);
  });
});
