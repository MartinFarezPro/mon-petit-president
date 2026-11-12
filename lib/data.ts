import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Faits } from "./paris";
import type { Corrections } from "./quiz";
import type {
  Candidate, FinalPick, League, PariReponse, Parrainages, Poll, Profile, Quiz, QuizQuestion, QuizReponse, Reaction, Results,
} from "./types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  let profile: Profile | null = null;
  if (userId) {
    const load = () => supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    let { data: p } = await load();
    if (!p) {
      // Compte sans profil (créé avant le trigger, ou trigger en échec) : on le crée au lieu de boucler sur /connexion.
      await supabase.rpc("ensure_profile");
      ({ data: p } = await load());
    }
    profile = p as Profile | null;
  }
  return { supabase, userId, profile };
});

export async function requireUser(next = "/ligues") {
  const s = await getSession();
  if (!s.userId || !s.profile) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return s as { supabase: typeof s.supabase; userId: string; profile: Profile };
}

export const getCandidates = cache(async (withInactive = false) => {
  const { supabase } = await getSession();
  let q = supabase.from("candidates").select("*").order("ordre");
  if (!withInactive) q = q.eq("actif", true);
  const { data } = await q;
  return (data ?? []) as Candidate[];
});

/** Deux derniers relevés de sondages (le plus récent d'abord). */
export const getPolls = cache(async () => {
  const { supabase } = await getSession();
  const { data } = await supabase.from("polls").select("*").order("date", { ascending: false }).order("id", { ascending: false }).limit(12);
  return (data ?? []) as Poll[];
});

export const getResults = cache(async () => {
  const { supabase } = await getSession();
  const { data } = await supabase.from("results").select("*").eq("id", "officiel").maybeSingle();
  return (data ?? null) as Results | null;
});

export const getParrainages = cache(async () => {
  const { supabase } = await getSession();
  const { data } = await supabase.from("parrainages").select("date, valeurs").order("date", { ascending: false });
  return (data ?? []) as Parrainages[];
});

/** Quiz publiés (ou tous pour un superadmin), leurs questions (sans la réponse) et les corrections visibles. */
export const getQuizzes = cache(async () => {
  const { supabase } = await getSession();
  const [{ data: quizzes }, { data: questions }, { data: corr }] = await Promise.all([
    supabase.from("quiz").select("id, titre, ouverture, cloture").order("ouverture", { ascending: false }),
    supabase.from("quiz_questions").select("id, quiz_id, ordre, citation, contexte, date_citation, choix").order("ordre"),
    supabase.rpc("quiz_corrections"),
  ]);
  const corrections: Corrections = Object.fromEntries(
    ((corr ?? []) as { question_id: string; reponse: string }[]).map((c) => [c.question_id, c.reponse]),
  );
  return { quizzes: (quizzes ?? []) as Quiz[], questions: (questions ?? []) as QuizQuestion[], corrections };
});

/** Données officielles qui tranchent les paris (candidats inactifs compris : un retrait compte). */
export const getFaits = cache(async (): Promise<Faits> => {
  const [polls, parrainages, results, candidates] = await Promise.all([getPolls(), getParrainages(), getResults(), getCandidates(true)]);
  return { polls, parrainages, results: results ? normalizeResults(results) : null, candidates };
});

export type LeagueContext = Awaited<ReturnType<typeof loadLeague>>;

export const loadLeague = cache(async (leagueId: string) => {
  const { supabase, userId, profile } = await requireUser(`/ligues/${leagueId}`);
  if (!/^[0-9a-f-]{36}$/i.test(leagueId)) notFound();

  const { data: league } = await supabase.from("leagues").select("*").eq("id", leagueId).maybeSingle();
  if (!league) notFound();

  const [members, picks, pickStatus, parisStatus, reactions, candidates, polls, results, faits, quiz] =
    await Promise.all([
      supabase.from("league_members").select("user_id, joined_at, profiles(*)").eq("league_id", leagueId),
      supabase.from("final_picks").select("*").eq("league_id", leagueId),
      supabase.rpc("league_pick_status", { p_league: leagueId }),
      supabase.rpc("league_paris_status", { p_league: leagueId }),
      supabase.from("reactions").select("*").eq("league_id", leagueId),
      getCandidates(),
      getPolls(),
      getResults(),
      getFaits(),
      getQuizzes(),
    ]);

  const memberIds = (members.data ?? []).map((m) => m.user_id as string);
  const [{ data: paris }, { data: quizRep }] = await Promise.all([
    supabase.from("paris_reponses").select("*").in("user_id", memberIds),
    supabase.from("quiz_reponses").select("*").in("user_id", memberIds),
  ]);

  const memberProfiles = (members.data ?? [])
    .map((m) => ({ ...(m.profiles as unknown as Profile), joined_at: m.joined_at as string }))
    .filter((p) => p && p.id);

  return {
    supabase,
    userId,
    me: profile,
    league: league as League,
    isAdmin: league.admin_id === userId,
    members: memberProfiles,
    profilesById: Object.fromEntries(memberProfiles.map((p) => [p.id, p])) as Record<string, Profile>,
    picks: ((picks.data ?? []) as FinalPick[]).map(normalizePick),
    pickStatus: (pickStatus.data ?? []) as { user_id: string; updated_at: string }[],
    parisStatus: (parisStatus.data ?? []) as { user_id: string; pari_id: string }[],
    parisReponses: (paris ?? []) as PariReponse[],
    faits,
    quizzes: quiz.quizzes,
    quizQuestions: quiz.questions,
    corrections: quiz.corrections,
    quizReponses: (quizRep ?? []) as QuizReponse[],
    reactions: (reactions.data ?? []) as Reaction[],
    candidates,
    polls,
    results: results ? normalizeResults(results) : null,
  };
});

function num(x: unknown) {
  return x == null ? null : Number(x);
}

function normalizePick(p: FinalPick): FinalPick {
  return { ...p, score_gagnant: num(p.score_gagnant), participation: num(p.participation), scores: p.scores ?? {} };
}

function normalizeResults(r: Results): Results {
  return {
    ...r, participation: num(r.participation), score_gagnant: num(r.score_gagnant),
    participation_t2: num(r.participation_t2), scores: r.scores ?? {},
  };
}
