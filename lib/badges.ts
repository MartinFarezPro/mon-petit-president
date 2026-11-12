import { FAVORIS } from "./constants";
import { quizClos, serie } from "./quiz";
import type { PlayerStanding } from "./scoring";
import type { FinalPick, Quiz, QuizQuestion, QuizReponse } from "./types";

export type Badge = { id: string; emoji: string; label: string; title: string };

export const BADGES = {
  leader: { id: "leader", emoji: "🥇", label: "Maillot jaune", title: "En tête du classement général" },
  lanterne: { id: "lanterne", emoji: "🏮", label: "Lanterne rouge", title: "Dernier du classement général" },
  nostradamus: { id: "nostradamus", emoji: "🔮", label: "Nostradamus", title: "Meilleur score au dernier quiz" },
  boulet: { id: "boulet", emoji: "🪨", label: "Boulet de la semaine", title: "Pire score au dernier quiz" },
  sansfaute: { id: "sansfaute", emoji: "💯", label: "Sans-faute", title: "10/10 au dernier quiz" },
  serie: { id: "serie", emoji: "🔥", label: "En série", title: "A joué tous les quiz depuis au moins 3 semaines" },
  flair: { id: "flair", emoji: "🎯", label: "Flair", title: "Au moins un pari parfait" },
  kamikaze: { id: "kamikaze", emoji: "🪂", label: "Kamikaze", title: "Capitaine hors des 4 favoris" },
} satisfies Record<string, Badge>;

export function computeBadges(opts: {
  standings: PlayerStanding[];
  quizzes: Quiz[];
  quizQuestions: QuizQuestion[];
  quizReponses: QuizReponse[];
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

  const last = [...opts.quizzes].filter((z) => quizClos(z, now)).sort((a, b) => +new Date(b.cloture) - +new Date(a.cloture))[0];
  if (last) {
    const pts = st.map((s) => ({ id: s.userId, p: s.quizDetail[last.id] ?? 0 }));
    const hi = Math.max(...pts.map((x) => x.p));
    const lo = Math.min(...pts.map((x) => x.p));
    const n = opts.quizQuestions.filter((q) => q.quiz_id === last.id).length;
    if (hi > 0) pts.filter((x) => x.p === hi).forEach((x) => give(x.id, x.p >= n ? BADGES.sansfaute : BADGES.nostradamus));
    if (pts.length >= 3 && lo < hi) pts.filter((x) => x.p === lo).forEach((x) => give(x.id, BADGES.boulet));
  }

  for (const s of st) {
    if (serie(opts.quizzes, opts.quizQuestions, opts.quizReponses, s.userId, now) >= 3) give(s.userId, BADGES.serie);
    if (Object.values(s.parisDetail).some((p) => p >= 20)) give(s.userId, BADGES.flair);
  }

  if (opts.locked) {
    for (const p of opts.picks) {
      if (p.capitaine && !(FAVORIS as readonly string[]).includes(p.capitaine)) give(p.user_id, BADGES.kamikaze);
    }
  }
  return out;
}
