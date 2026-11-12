"use server";

import { revalidatePath } from "next/cache";
import { getCandidates, requireUser } from "@/lib/data";
import { PARIS_BY_ID } from "@/lib/paris";
import { pgError } from "./state";

export type PariResult = { ok: true; updated_at: string | null } | { ok: false; error: string };

/** Enregistre (ou retire, si `reponse` est vide et que le pari n'est pas à plusieurs candidats) un pari. */
export async function savePari(pariId: string, reponse: string[], leagueId: string): Promise<PariResult> {
  const { supabase, userId } = await requireUser(`/ligues/${leagueId}/paris`);
  const pari = PARIS_BY_ID[pariId];
  if (!pari) return { ok: false, error: "Pari inconnu." };
  const now = new Date();
  if (now >= new Date(pari.cloture)) return { ok: false, error: "Trop tard : ce pari est clos." };
  if (now < new Date(pari.ouverture)) return { ok: false, error: "Ce pari n'est pas encore ouvert." };

  const valid = pari.kind === "choix"
    ? new Set((pari.choix ?? []).map((c) => c.id))
    : new Set((await getCandidates()).map((c) => c.id));
  const clean = [...new Set(reponse.filter((r) => valid.has(r)))];
  if (pari.kind !== "candidats" && clean.length > 1) return { ok: false, error: "Un seul choix possible." };

  const { data: prev } = await supabase.from("paris_reponses").select("verrouille_le").match({ user_id: userId, pari_id: pariId }).maybeSingle();
  if (prev?.verrouille_le) return { ok: false, error: "Ce pari est verrouillé 🔒" };

  if (clean.length === 0 && pari.kind !== "candidats") {
    const { error } = await supabase.from("paris_reponses").delete().match({ user_id: userId, pari_id: pariId });
    if (error) return { ok: false, error: pgError(error) };
    revalidatePath("/ligues", "layout");
    return { ok: true, updated_at: null };
  }

  const { data, error } = await supabase
    .from("paris_reponses")
    .upsert({ user_id: userId, pari_id: pariId, reponse: clean }, { onConflict: "user_id,pari_id" })
    .select("updated_at")
    .single();
  if (error) return { ok: false, error: pgError(error) };
  revalidatePath("/ligues", "layout");
  return { ok: true, updated_at: data.updated_at as string };
}

export type LockResult = { ok: true; verrouille_le: string } | { ok: false; error: string };

/** Pose le cadenas : le pari ne bouge plus, et sa valeur est figée à l'heure du serveur. */
export async function lockPari(pariId: string, leagueId: string): Promise<LockResult> {
  const { supabase, userId } = await requireUser(`/ligues/${leagueId}/paris`);
  const pari = PARIS_BY_ID[pariId];
  if (!pari) return { ok: false, error: "Pari inconnu." };
  if (new Date() >= new Date(pari.cloture)) return { ok: false, error: "Trop tard : ce pari est clos." };
  const { data, error } = await supabase
    .from("paris_reponses")
    .update({ verrouille_le: new Date().toISOString() }) // l'heure est réécrite par la base (now())
    .match({ user_id: userId, pari_id: pariId })
    .is("verrouille_le", null)
    .select("verrouille_le")
    .maybeSingle();
  if (error) return { ok: false, error: pgError(error) };
  if (!data) return { ok: false, error: "Place d'abord ton pari, ou il est déjà verrouillé." };
  revalidatePath("/ligues", "layout");
  return { ok: true, verrouille_le: data.verrouille_le as string };
}
