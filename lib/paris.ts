import { PREMIER_TOUR } from "./constants";
import { shortName } from "./format";
import type { Candidate, PariReponse, Parrainages, Poll, Results } from "./types";

/**
 * Paris de la saison. Chacun se tranche tout seul à partir des données officielles déjà en base
 * (sondages, parrainages du Conseil constitutionnel, résultats du ministère de l'Intérieur).
 * Les dates doivent rester alignées avec la table `paris` (migration 20261112000000_paris_quiz.sql).
 */

/** Points d'un pari parfait, pris dès l'ouverture. 14 paris × 25 = 350 pts. */
export const POINTS_PARI = 25;
/**
 * Le cadenas : un pari verrouillé à l'ouverture vaut 100 %, puis de moins en moins chaque jour,
 * jusqu'à 50 % à la clôture. Un pari jamais verrouillé est figé à la clôture, donc à 50 %.
 */
export const PRECOCITE_MIN = 0.5;
/** Date limite de dépôt des parrainages. */
export const PARRAINAGES_FIN = "2027-03-12";
export const SEUIL_PARRAINAGES = 500;

export type PariKind = "candidats" | "candidat" | "choix";
export type Phase = "sondages" | "parrainages" | "premier_tour" | "second_tour";

export const PHASES: Record<Phase, { emoji: string; titre: string }> = {
  sondages: { emoji: "📊", titre: "La guerre des sondages" },
  parrainages: { emoji: "✍️", titre: "La course aux 500 signatures" },
  premier_tour: { emoji: "🗳️", titre: "Le 1er tour" },
  second_tour: { emoji: "⚔️", titre: "Le 2nd tour" },
};

export type Pari = {
  id: string;
  phase: Phase;
  emoji: string;
  question: string;
  aide: string;
  kind: PariKind;
  choix?: { id: string; label: string }[];
  ouverture: string;
  cloture: string;
};

const OUV = "2026-11-12T00:00:00+01:00";
/** Grand verrouillage : début de la campagne officielle (2e lundi avant le 1er tour), lundi 5 avril 2027 à 0 h. */
export const VERROU_CAMPAGNE = "2027-04-04T23:59:59+02:00";
/** Paris sur les parrainages : clos avant que les publications du Conseil constitutionnel ne donnent la réponse. */
const VERROU_PARRAINAGES = "2027-01-31T23:59:59+01:00";

export const PARIS: Pari[] = [
  {
    id: "sondage_progression", phase: "sondages", emoji: "🚀",
    question: "Qui gagnera le plus de points dans les sondages entre le 1er janvier et le 1er mars ?",
    aide: "Écart entre le dernier relevé publié avant le 1er janvier et le dernier avant le 1er mars.",
    kind: "candidat", ouverture: OUV, cloture: "2026-12-31T23:59:59+01:00",
  },
  {
    id: "sondage_podium", phase: "sondages", emoji: "🥉",
    question: "Qui sera 3e des sondages au 1er mars ?",
    aide: "Dernier relevé publié avant le 1er mars.",
    kind: "candidat", ouverture: OUV, cloture: "2026-12-31T23:59:59+01:00",
  },
  {
    id: "p500_rates", phase: "parrainages", emoji: "🚫",
    question: "Qui n'aura pas ses 500 parrainages ?",
    aide: "Coche tous ceux qui resteront sous la barre (ou qui renonceront). Un mauvais candidat coché coûte des points.",
    kind: "candidats", ouverture: OUV, cloture: VERROU_PARRAINAGES,
  },
  {
    id: "p500_premier", phase: "parrainages", emoji: "🏁",
    question: "Qui franchira le premier la barre des 500 parrainages ?",
    aide: "Selon les publications du Conseil constitutionnel. Ex æquo dans la même publication : tous gagnants.",
    kind: "candidat", ouverture: OUV, cloture: VERROU_PARRAINAGES,
  },
  {
    id: "p500_record", phase: "parrainages", emoji: "🖋️",
    question: "Qui récoltera le plus de parrainages ?",
    aide: "Total à la clôture du dépôt.",
    kind: "candidat", ouverture: OUV, cloture: VERROU_PARRAINAGES,
  },
  {
    id: "nb_candidats", phase: "parrainages", emoji: "🔢",
    question: "Combien de candidats auront leurs 500 parrainages ?",
    aide: "Total à la clôture du dépôt.",
    kind: "choix", ouverture: OUV, cloture: VERROU_PARRAINAGES,
    choix: [
      { id: "max9", label: "9 ou moins" }, { id: "10_11", label: "10 ou 11" },
      { id: "12_13", label: "12 ou 13" }, { id: "14plus", label: "14 ou plus" },
    ],
  },
  {
    id: "surcote", phase: "premier_tour", emoji: "🎈",
    question: "Qui sera le plus surcoté par les sondages ?",
    aide: "Plus gros écart entre le dernier relevé avant le 1er tour et le score réel, à la baisse.",
    kind: "candidat", ouverture: OUV, cloture: VERROU_CAMPAGNE,
  },
  {
    id: "souscote", phase: "premier_tour", emoji: "🐢",
    question: "Qui sera le plus sous-coté par les sondages ?",
    aide: "Plus gros écart entre le dernier relevé avant le 1er tour et le score réel, à la hausse.",
    kind: "candidat", ouverture: OUV, cloture: VERROU_CAMPAGNE,
  },
  {
    id: "sous5", phase: "premier_tour", emoji: "💸",
    question: "Qui fera moins de 5 % au 1er tour (et ne sera pas remboursé) ?",
    aide: "Coche tous ceux qui passeront sous 5 %. Les non-candidats ne comptent pas.",
    kind: "candidats", ouverture: OUV, cloture: VERROU_CAMPAGNE,
  },
  {
    id: "troisieme", phase: "premier_tour", emoji: "😤",
    question: "Qui finira 3e du 1er tour, au pied du podium ?",
    aide: "Résultats officiels du ministère de l'Intérieur.",
    kind: "candidat", ouverture: OUV, cloture: VERROU_CAMPAGNE,
  },
  {
    id: "plus10", phase: "premier_tour", emoji: "🔟",
    question: "Combien de candidats feront 10 % ou plus au 1er tour ?",
    aide: "Résultats officiels du ministère de l'Intérieur.",
    kind: "choix", ouverture: OUV, cloture: VERROU_CAMPAGNE,
    choix: [
      { id: "1_2", label: "1 ou 2" }, { id: "3", label: "3" }, { id: "4", label: "4" }, { id: "5plus", label: "5 ou plus" },
    ],
  },
  {
    id: "ecart23", phase: "premier_tour", emoji: "📏",
    question: "Quel écart entre le 2e (qualifié) et le 3e (éliminé) ?",
    aide: "En points de pourcentage.",
    kind: "choix", ouverture: OUV, cloture: VERROU_CAMPAGNE,
    choix: [
      { id: "moins2", label: "Moins de 2 pts" }, { id: "2a5", label: "De 2 à 5 pts" }, { id: "plus5", label: "Plus de 5 pts" },
    ],
  },
  {
    id: "premier_elu", phase: "second_tour", emoji: "👑",
    question: "Le 1er du 1er tour sera-t-il élu président ?",
    aide: "Tranché au soir du 2nd tour.",
    kind: "choix", ouverture: OUV, cloture: VERROU_CAMPAGNE,
    choix: [{ id: "oui", label: "Oui" }, { id: "non", label: "Non, retournement !" }],
  },
  {
    id: "participation_t2", phase: "second_tour", emoji: "🏃",
    question: "Participation au 2nd tour : plus haute qu'au 1er ?",
    aide: "Tranché au soir du 2nd tour.",
    kind: "choix", ouverture: OUV, cloture: VERROU_CAMPAGNE,
    choix: [{ id: "plus", label: "Plus haute" }, { id: "moins", label: "Plus basse (ou égale)" }],
  },
];

export const PARIS_BY_ID = Object.fromEntries(PARIS.map((p) => [p.id, p])) as Record<string, Pari>;
export const PARIS_TOTAL = PARIS.length * POINTS_PARI;

export type Faits = {
  polls: Poll[];
  parrainages: Parrainages[];
  results: Results | null;
  candidates: Candidate[];
};

/** Résultat d'un pari tranché. */
export type Verdict = {
  /** Bonnes réponses (ids). */
  bonnes: string[];
  /** Pour les paris à plusieurs candidats : les candidats en jeu (les autres sont ignorés). */
  enJeu?: string[];
  /** Explication courte affichée aux joueurs. */
  detail: string;
  /** Date de la donnée qui a tranché (un pari tranché avant sa clôture est annulé). */
  le: string;
};

const noon = (d: string) => new Date(`${d}T12:00:00+01:00`);

/** Dernier relevé de sondage publié strictement avant une date. */
export function pollBefore(polls: Poll[], before: Date): Poll | null {
  return [...polls]
    .filter((p) => noon(p.date) < before)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))[0] ?? null;
}

function finalParrainages(parr: Parrainages[]): Parrainages | null {
  const last = [...parr].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return last && last.date >= PARRAINAGES_FIN ? last : null;
}

function premierTour(results: Results | null) {
  const scores = results?.scores ?? {};
  const ranking = Object.entries(scores)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => b[1] - a[1]);
  return ranking.length >= 3 ? ranking : null;
}

const pts = (x: number) => x.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/** Les ids ex æquo au maximum d'une liste [id, valeur]. */
function argmax(rows: [string, number][]): string[] {
  if (!rows.length) return [];
  const m = Math.max(...rows.map((r) => r[1]));
  return rows.filter((r) => Math.abs(r[1] - m) < 1e-9).map((r) => r[0]);
}

/** Tranche un pari à partir des données, ou null s'il n'est pas encore tranché. */
export function trancher(pari: Pari, f: Faits, now = new Date()): Verdict | null {
  const nom = (id: string) => { const n = f.candidates.find((c) => c.id === id)?.nom; return n ? shortName(n) : id; };
  const noms = (ids: string[]) => ids.map(nom).join(", ");

  switch (pari.id) {
    case "sondage_progression": {
      if (now < new Date("2027-03-01T00:00:00+01:00")) return null;
      const a = pollBefore(f.polls, new Date("2027-01-01T00:00:00+01:00"));
      const b = pollBefore(f.polls, new Date("2027-03-01T00:00:00+01:00"));
      if (!a || !b || a.id === b.id) return null;
      const rows = Object.keys(b.valeurs).filter((id) => a.valeurs[id] != null)
        .map((id): [string, number] => [id, b.valeurs[id] - a.valeurs[id]]);
      const best = argmax(rows);
      if (!best.length) return null;
      const d = rows.find((r) => r[0] === best[0])![1];
      return { bonnes: best, detail: `${noms(best)} : ${d >= 0 ? "+" : ""}${pts(d)} pts`, le: b.date };
    }
    case "sondage_podium": {
      if (now < new Date("2027-03-01T00:00:00+01:00")) return null;
      const p = pollBefore(f.polls, new Date("2027-03-01T00:00:00+01:00"));
      if (!p) return null;
      const rows = Object.entries(p.valeurs).sort((a, b) => b[1] - a[1]);
      if (rows.length < 3) return null;
      const third = rows[2][1];
      const bonnes = rows.filter((r) => r[1] === third).map((r) => r[0]);
      return { bonnes, detail: `${noms(bonnes)} à ${pts(third)} % (relevé du ${p.date.split("-").reverse().join("/")})`, le: p.date };
    }
    case "p500_rates": {
      const fin = finalParrainages(f.parrainages);
      if (!fin) return null;
      const enJeu = f.candidates.map((c) => c.id);
      const bonnes = enJeu.filter((id) => (fin.valeurs[id] ?? 0) < SEUIL_PARRAINAGES);
      return { bonnes, enJeu, detail: bonnes.length ? `Sous la barre : ${noms(bonnes)}` : "Tout le monde a eu ses 500 !", le: fin.date };
    }
    case "p500_premier": {
      const first = [...f.parrainages].sort((a, b) => (a.date < b.date ? -1 : 1))
        .find((p) => Object.values(p.valeurs).some((v) => v >= SEUIL_PARRAINAGES));
      if (!first) return null;
      const bonnes = Object.entries(first.valeurs).filter(([, v]) => v >= SEUIL_PARRAINAGES).map(([id]) => id);
      return { bonnes, detail: `${noms(bonnes)}, dans la publication du ${first.date.split("-").reverse().join("/")}`, le: first.date };
    }
    case "p500_record": {
      const fin = finalParrainages(f.parrainages);
      if (!fin) return null;
      const bonnes = argmax(Object.entries(fin.valeurs));
      if (!bonnes.length) return null;
      return { bonnes, detail: `${noms(bonnes)} : ${fin.valeurs[bonnes[0]].toLocaleString("fr-FR")} parrainages`, le: fin.date };
    }
    case "nb_candidats": {
      const fin = finalParrainages(f.parrainages);
      if (!fin) return null;
      const n = Object.values(fin.valeurs).filter((v) => v >= SEUIL_PARRAINAGES).length;
      const id = n <= 9 ? "max9" : n <= 11 ? "10_11" : n <= 13 ? "12_13" : "14plus";
      return { bonnes: [id], detail: `${n} candidats officiels`, le: fin.date };
    }
    case "surcote":
    case "souscote": {
      const t1 = premierTour(f.results);
      const p = pollBefore(f.polls, PREMIER_TOUR);
      if (!t1 || !p) return null;
      const sign = pari.id === "surcote" ? 1 : -1;
      const rows = t1.filter(([id]) => p.valeurs[id] != null)
        .map(([id, real]): [string, number] => [id, sign * (p.valeurs[id] - real)]);
      const bonnes = argmax(rows);
      if (!bonnes.length) return null;
      const d = rows.find((r) => r[0] === bonnes[0])![1];
      return {
        bonnes,
        detail: `${noms(bonnes)} : ${pari.id === "surcote" ? "−" : "+"}${pts(Math.abs(d))} pts par rapport aux sondages`,
        le: PREMIER_TOUR.toISOString(),
      };
    }
    case "sous5": {
      const t1 = premierTour(f.results);
      if (!t1) return null;
      const bonnes = t1.filter(([, v]) => v < 5).map(([id]) => id);
      return { bonnes, enJeu: t1.map(([id]) => id), detail: bonnes.length ? `Sous 5 % : ${noms(bonnes)}` : "Personne sous 5 %", le: PREMIER_TOUR.toISOString() };
    }
    case "troisieme": {
      const t1 = premierTour(f.results);
      if (!t1) return null;
      const bonnes = t1.filter(([, v]) => v === t1[2][1]).map(([id]) => id);
      return { bonnes, detail: `${noms(bonnes)} à ${pts(t1[2][1])} %`, le: PREMIER_TOUR.toISOString() };
    }
    case "plus10": {
      const t1 = premierTour(f.results);
      if (!t1) return null;
      const n = t1.filter(([, v]) => v >= 10).length;
      const id = n <= 2 ? "1_2" : n === 3 ? "3" : n === 4 ? "4" : "5plus";
      return { bonnes: [id], detail: `${n} candidat${n > 1 ? "s" : ""} à 10 % ou plus`, le: PREMIER_TOUR.toISOString() };
    }
    case "ecart23": {
      const t1 = premierTour(f.results);
      if (!t1) return null;
      const d = Math.round((t1[1][1] - t1[2][1]) * 100) / 100;
      const id = d < 2 ? "moins2" : d <= 5 ? "2a5" : "plus5";
      return { bonnes: [id], detail: `${pts(d)} pts entre ${nom(t1[1][0])} et ${nom(t1[2][0])}`, le: PREMIER_TOUR.toISOString() };
    }
    case "premier_elu": {
      const t1 = premierTour(f.results);
      if (!t1 || !f.results?.gagnant) return null;
      const oui = f.results.gagnant === t1[0][0];
      return { bonnes: [oui ? "oui" : "non"], detail: `${nom(f.results.gagnant)} élu·e, ${oui ? "comme" : "contrairement"} au 1er tour`, le: new Date("2027-05-02T20:00:00+02:00").toISOString() };
    }
    case "participation_t2": {
      const a = f.results?.participation, b = f.results?.participation_t2;
      if (a == null || b == null) return null;
      return { bonnes: [b > a ? "plus" : "moins"], detail: `${pts(b)} % au 2nd tour contre ${pts(a)} % au 1er`, le: new Date("2027-05-02T20:00:00+02:00").toISOString() };
    }
  }
  return null;
}

/**
 * Justesse d'une réponse entre 0 et 1.
 * Plusieurs candidats : part des bons trouvés − part des mauvais cochés (jamais sous 0),
 * pour que tout cocher (ou rien) ne rapporte rien.
 */
export function justesse(pari: Pari, v: Verdict, reponse: string[]): number {
  if (pari.kind !== "candidats") return reponse.some((r) => v.bonnes.includes(r)) ? 1 : 0;
  const enJeu = new Set(v.enJeu ?? []);
  const vrais = new Set(v.bonnes.filter((id) => enJeu.has(id)));
  const coches = new Set(reponse.filter((id) => enJeu.has(id)));
  const faux = enJeu.size - vrais.size;
  const bons = [...coches].filter((id) => vrais.has(id)).length;
  const mauvais = coches.size - bons;
  const partBons = vrais.size ? bons / vrais.size : 1;
  const partMauvais = faux ? mauvais / faux : 0;
  return Math.max(0, partBons - partMauvais);
}

/** Coefficient de précocité selon l'heure du verrou : 100 % à l'ouverture, 50 % à la clôture. */
export function precocite(pari: Pari, at: string | Date): number {
  const o = +new Date(pari.ouverture), c = +new Date(pari.cloture), t = +new Date(at);
  const left = Math.min(1, Math.max(0, (c - t) / (c - o)));
  return PRECOCITE_MIN + (1 - PRECOCITE_MIN) * left;
}

export type PariScore = { points: number; justesse: number; precocite: number };

/** Points d'un pari, ou null s'il ne compte pas (pas clos, pas tranché, ou annulé). */
export function scorePari(pari: Pari, v: Verdict | null, rep: Pick<PariReponse, "reponse" | "verrouille_le"> | undefined, now = new Date()): PariScore | null {
  if (!compte(pari, v, now)) return null;
  if (!rep) return { points: 0, justesse: 0, precocite: 0 };
  const j = justesse(pari, v!, rep.reponse);
  const p = precocite(pari, rep.verrouille_le ?? pari.cloture);
  return { points: Math.round(POINTS_PARI * j * p * 10) / 10, justesse: j, precocite: p };
}

/** Un pari compte s'il est clos et tranché par une donnée postérieure à sa clôture. */
export function compte(pari: Pari, v: Verdict | null, now = new Date()): v is Verdict {
  return !!v && now >= new Date(pari.cloture) && !annule(pari, v);
}

/** Tranché avant même sa clôture (ex. un candidat passe les 500 très tôt) : le pari est annulé pour tous. */
export function annule(pari: Pari, v: Verdict) {
  return new Date(v.le.length === 10 ? `${v.le}T23:59:59+01:00` : v.le) < new Date(pari.cloture);
}
