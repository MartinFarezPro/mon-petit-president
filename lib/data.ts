import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type {
  Answer, Candidate, FinalPick, League, Matchday, Poll, Profile, Question, Reaction, Results,
} from "./types";

export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  let profile: Profile | null = null;
  if (userId) {
    const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
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

export type LeagueContext = Awaited<ReturnType<typeof loadLeague>>;

export const loadLeague = cache(async (leagueId: string) => {
  const { supabase, userId, profile } = await requireUser(`/ligues/${leagueId}`);
  if (!/^[0-9a-f-]{36}$/i.test(leagueId)) notFound();

  const { data: league } = await supabase.from("leagues").select("*").eq("id", leagueId).maybeSingle();
  if (!league) notFound();

  const [members, matchdays, picks, pickStatus, answerStatus, reactions, candidates, polls, results] =
    await Promise.all([
      supabase.from("league_members").select("user_id, joined_at, profiles(*)").eq("league_id", leagueId),
      supabase.from("matchdays").select("*").eq("league_id", leagueId).order("cloture", { ascending: true }),
      supabase.from("final_picks").select("*").eq("league_id", leagueId),
      supabase.rpc("league_pick_status", { p_league: leagueId }),
      supabase.rpc("league_answer_status", { p_league: leagueId }),
      supabase.from("reactions").select("*").eq("league_id", leagueId),
      getCandidates(),
      getPolls(),
      getResults(),
    ]);

  const mds = (matchdays.data ?? []) as Matchday[];
  const mdIds = mds.map((m) => m.id);
  const { data: qs } = mdIds.length
    ? await supabase.from("questions").select("*").in("matchday_id", mdIds).order("ordre")
    : { data: [] };
  const qIds = (qs ?? []).map((q) => q.id as string);
  const { data: ans } = qIds.length
    ? await supabase.from("answers").select("*").in("question_id", qIds)
    : { data: [] };

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
    matchdays: mds,
    questions: (qs ?? []).map((q) => ({ ...q, points: Number(q.points) })) as Question[],
    answers: (ans ?? []) as Answer[],
    picks: ((picks.data ?? []) as FinalPick[]).map(normalizePick),
    pickStatus: (pickStatus.data ?? []) as { user_id: string; updated_at: string }[],
    answerStatus: (answerStatus.data ?? []) as { question_id: string; user_id: string }[],
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
  return { ...r, participation: num(r.participation), score_gagnant: num(r.score_gagnant), scores: r.scores ?? {} };
}
