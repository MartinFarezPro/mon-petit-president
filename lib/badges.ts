import { FAVORIS } from "./constants";
import { isQuestionScored, questionCloture, type PlayerStanding } from "./scoring";
import type { FinalPick, Matchday, Question } from "./types";

export type Badge = { id: string; emoji: string; label: string; title: string };

export const BADGES = {
  leader: { id: "leader", emoji: "🥇", label: "Maillot jaune", title: "En tête du classement général" },
  lanterne: { id: "lanterne", emoji: "🏮", label: "Lanterne rouge", title: "Dernier du classement général" },
  nostradamus: { id: "nostradamus", emoji: "🔮", label: "Nostradamus", title: "Meilleur score de la dernière journée" },
  boulet: { id: "boulet", emoji: "🪨", label: "Boulet de la semaine", title: "Pire score de la dernière journée" },
  sansfaute: { id: "sansfaute", emoji: "💯", label: "Sans-faute", title: "Tous les points de la dernière journée" },
  assidu: { id: "assidu", emoji: "📅", label: "Assidu", title: "A répondu à toutes les questions closes" },
  kamikaze: { id: "kamikaze", emoji: "🪂", label: "Kamikaze", title: "Capitaine hors des 4 favoris" },
} satisfies Record<string, Badge>;

/** Dernière journée close dont au moins une question est corrigée. */
export function lastScoredMatchday(matchdays: Matchday[], questions: Question[], now = new Date()) {
  const scored = matchdays
    .filter((m) => {
      const qs = questions.filter((q) => q.matchday_id === m.id);
      return (
        qs.length > 0 &&
        qs.some(isQuestionScored) &&
        qs.every((q) => questionCloture(q, m).getTime() <= now.getTime())
      );
    })
    .sort((a, b) => +new Date(b.cloture) - +new Date(a.cloture));
  return scored[0] ?? null;
}

export function computeBadges(opts: {
  standings: PlayerStanding[];
  matchdays: Matchday[];
  questions: Question[];
  picks: FinalPick[];
  locked: boolean;
  now?: Date;
}): Record<string, Badge[]> {
  const now = opts.now ?? new Date();
  const out: Record<string, Badge[]> = {};
  const give = (uid: string, b: Badge) => (out[uid] ??= []).push(b);
  const st = opts.standings;
  if (!st.length) return out;

  const totals = st.map((s) => s.total);
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  if (max > 0) st.filter((s) => s.total === max).forEach((s) => give(s.userId, BADGES.leader));
  if (st.length >= 3 && min < max) st.filter((s) => s.total === min).forEach((s) => give(s.userId, BADGES.lanterne));

  const md = lastScoredMatchday(opts.matchdays, opts.questions, now);
  if (md) {
    const pts = st.map((s) => ({ id: s.userId, p: s.byMatchday[md.id] ?? 0 }));
    const hi = Math.max(...pts.map((x) => x.p));
    const lo = Math.min(...pts.map((x) => x.p));
    if (hi > 0) pts.filter((x) => x.p === hi).forEach((x) => give(x.id, BADGES.nostradamus));
    if (pts.length >= 3 && lo < hi) pts.filter((x) => x.p === lo).forEach((x) => give(x.id, BADGES.boulet));
    const maxPossible = opts.questions
      .filter((q) => q.matchday_id === md.id && isQuestionScored(q))
      .reduce((a, q) => a + Number(q.points), 0);
    if (maxPossible > 0) pts.filter((x) => x.p >= maxPossible - 1e-9).forEach((x) => give(x.id, BADGES.sansfaute));
  }

  const closedCount = opts.questions.filter((q) => {
    const m = opts.matchdays.find((x) => x.id === q.matchday_id);
    return m && questionCloture(q, m).getTime() <= now.getTime();
  }).length;
  if (closedCount > 0) st.filter((s) => s.answeredClosed >= closedCount).forEach((s) => give(s.userId, BADGES.assidu));

  if (opts.locked) {
    for (const p of opts.picks) {
      if (p.capitaine && !(FAVORIS as readonly string[]).includes(p.capitaine)) give(p.user_id, BADGES.kamikaze);
    }
  }
  return out;
}
