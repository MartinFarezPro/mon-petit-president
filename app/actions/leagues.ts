"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { fail, ok, pgError, type FormState } from "./state";

export async function createLeague(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const nom = String(form.get("nom") ?? "").trim().slice(0, 60);
  if (!nom) return fail("Donne un nom à ta ligue.");
  const { data, error } = await supabase.rpc("create_league", { p_nom: nom });
  if (error) return fail(pgError(error));
  redirect(`/ligues/${data}/admin?nouvelle=1`);
}

export async function joinLeague(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return fail("Le code fait 6 caractères.");
  const { data, error } = await supabase.rpc("join_league", { p_code: code });
  if (error) return fail(pgError(error));
  redirect(`/ligues/${data}`);
}

export async function leaveLeague(form: FormData) {
  const { supabase, userId } = await requireUser();
  const leagueId = String(form.get("league_id"));
  await supabase.from("league_members").delete().eq("league_id", leagueId).eq("user_id", userId);
  revalidatePath("/ligues");
  redirect("/ligues");
}

export async function renameLeague(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const leagueId = String(form.get("league_id"));
  const nom = String(form.get("nom") ?? "").trim().slice(0, 60);
  if (!nom) return fail("Nom vide.");
  const { error } = await supabase.from("leagues").update({ nom }).eq("id", leagueId);
  if (error) return fail(pgError(error));
  revalidatePath(`/ligues/${leagueId}`, "layout");
  return ok("Ligue renommée.");
}

export async function regenCode(form: FormData) {
  const { supabase } = await requireUser();
  const leagueId = String(form.get("league_id"));
  await supabase.rpc("regen_invite_code", { p_league: leagueId });
  revalidatePath(`/ligues/${leagueId}/admin`);
}

export async function kickMember(form: FormData) {
  const { supabase } = await requireUser();
  const leagueId = String(form.get("league_id"));
  const userId = String(form.get("user_id"));
  await supabase.from("league_members").delete().eq("league_id", leagueId).eq("user_id", userId);
  revalidatePath(`/ligues/${leagueId}`, "layout");
}

export async function deleteLeague(form: FormData) {
  const { supabase } = await requireUser();
  const leagueId = String(form.get("league_id"));
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "SUPPRIMER") {
    redirect(`/ligues/${leagueId}/admin?erreur=confirmation`);
  }
  await supabase.from("leagues").delete().eq("id", leagueId);
  revalidatePath("/ligues");
  redirect("/ligues");
}
