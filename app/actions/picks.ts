"use server";

import { revalidatePath } from "next/cache";
import { isLocked } from "@/lib/constants";
import { getCandidates, requireUser } from "@/lib/data";
import { fail, ok, pgError, type FormState } from "./state";

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || String(v).trim() === "") return null;
  const x = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(x) ? Math.round(x * 10) / 10 : null;
}

export async function saveFinalPick(_prev: FormState, form: FormData): Promise<FormState> {
  const leagueId = String(form.get("league_id"));
  const { supabase, userId } = await requireUser(`/ligues/${leagueId}/prono`);
  if (isLocked()) return fail("Les pronos sont clos depuis le 17 avril à 23 h 59.");

  const ids = new Set((await getCandidates()).map((c) => c.id));
  const pickId = (k: string) => {
    const v = String(form.get(k) ?? "");
    return ids.has(v) ? v : null;
  };

  const q1 = pickId("q1");
  const q2 = pickId("q2");
  let gagnant = pickId("gagnant");
  if (q1 && q1 === q2) return fail("Choisis deux qualifiés différents.");
  if (gagnant && gagnant !== q1 && gagnant !== q2) gagnant = null;

  const scores: Record<string, number> = {};
  for (const id of ids) {
    const v = num(form.get(`score_${id}`));
    if (v != null) {
      if (v < 0 || v > 100) return fail("Chaque score doit être entre 0 et 100 %.");
      scores[id] = v;
    }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total > 100.05) return fail(`Le total des scores dépasse 100 % (${total.toFixed(1)} %).`);

  const score_gagnant = num(form.get("score_gagnant"));
  if (score_gagnant != null && (score_gagnant < 50 || score_gagnant > 100)) return fail("Le score du vainqueur doit être entre 50 et 100 %.");
  const participation = num(form.get("participation"));
  if (participation != null && (participation < 0 || participation > 100)) return fail("Participation entre 0 et 100 %.");

  const surprise = pickId("surprise");
  const capitaine = pickId("capitaine");

  const { error } = await supabase.from("final_picks").upsert(
    { user_id: userId, league_id: leagueId, q1, q2, gagnant, score_gagnant, scores, capitaine, surprise, participation },
    { onConflict: "user_id,league_id" },
  );
  if (error) return fail(pgError(error));
  revalidatePath(`/ligues/${leagueId}`, "layout");
  const heure = new Date().toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  return ok(`Prono enregistré à ${heure}. Tu peux le modifier jusqu'à la clôture.`);
}
