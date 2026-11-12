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

  if (clean.length === 0 && pari.kind !== "candidats") {
    const { error } = await supabase.from("paris_reponses").delete().match({ user_id: userId, pari_id: pariId });
    if (error) return { ok: false, error: pgError(error) };
    revalidatePath("/ligues", "layout");
    return { ok: true, updated_at: null };
  }

  // Inchangé : on ne touche pas à la date (elle sert au bonus de précocité).
  const { data: prev } = await supabase.from("paris_reponses").select("reponse, updated_at").match({ user_id: userId, pari_id: pariId }).maybeSingle();
  const same = prev && JSON.stringify([...(prev.reponse as string[])].sort()) === JSON.stringify([...clean].sort());
  if (same) return { ok: true, updated_at: prev.updated_at as string };

  const { data, error } = await supabase
    .from("paris_reponses")
    .upsert({ user_id: userId, pari_id: pariId, reponse: clean }, { onConflict: "user_id,pari_id" })
    .select("updated_at")
    .single();
  if (error) return { ok: false, error: pgError(error) };
  revalidatePath("/ligues", "layout");
  return { ok: true, updated_at: data.updated_at as string };
}
