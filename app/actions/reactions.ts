"use server";

import { revalidatePath } from "next/cache";
import { EMOJIS } from "@/lib/constants";
import { requireUser } from "@/lib/data";

export async function toggleReaction(form: FormData) {
  const leagueId = String(form.get("league_id"));
  const { supabase, userId } = await requireUser(`/ligues/${leagueId}`);
  const contexte = String(form.get("contexte")).slice(0, 40);
  const cible = String(form.get("cible_user"));
  const emoji = String(form.get("emoji"));
  if (!(EMOJIS as readonly string[]).includes(emoji)) return;

  const { data: mine } = await supabase
    .from("reactions").select("id")
    .match({ league_id: leagueId, contexte, cible_user: cible, user_id: userId, emoji })
    .maybeSingle();
  if (mine) await supabase.from("reactions").delete().eq("id", mine.id);
  else await supabase.from("reactions").insert({ league_id: leagueId, contexte, cible_user: cible, user_id: userId, emoji });

  const path = String(form.get("path") ?? "");
  revalidatePath(path.startsWith("/ligues/") ? path : `/ligues/${leagueId}`);
}
