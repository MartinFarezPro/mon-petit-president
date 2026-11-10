import type { SupabaseClient } from "@supabase/supabase-js";

/** Où envoyer le joueur juste après la connexion : complète son profil au premier passage. */
export async function pathAfterLogin(supabase: SupabaseClient, next: string) {
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (uid) {
    const { data: p } = await supabase.from("profiles").select("equipe").eq("id", uid).maybeSingle();
    if (p && !p.equipe) return `/profil?bienvenue=1&next=${encodeURIComponent(next)}`;
  }
  return next;
}
