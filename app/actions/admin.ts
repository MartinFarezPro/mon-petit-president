"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCandidates, requireUser } from "@/lib/data";
import { fail, ok, pgError, type FormState } from "./state";

async function requireSuperadmin() {
  const s = await requireUser("/admin");
  if (!s.profile.is_superadmin) redirect("/ligues");
  return s;
}

function num(v: FormDataEntryValue | null, digits = 1): number | null {
  if (v == null || String(v).trim() === "") return null;
  const x = parseFloat(String(v).replace(",", "."));
  const f = 10 ** digits;
  return Number.isFinite(x) ? Math.round(x * f) / f : null;
}

/** URL https d'un portrait, ou null. */
function photoUrl(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^https:\/\/\S+$/.test(s) ? s : null;
}

export async function saveCandidates(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const all = await getCandidates(true);
  for (const c of all) {
    const row = {
      nom: String(form.get(`nom_${c.id}`) ?? c.nom).trim() || c.nom,
      parti: String(form.get(`parti_${c.id}`) ?? c.parti).trim(),
      couleur: String(form.get(`couleur_${c.id}`) ?? c.couleur),
      ordre: Number(form.get(`ordre_${c.id}`) ?? c.ordre) || 100,
      actif: form.get(`actif_${c.id}`) === "on",
      photo: photoUrl(form.get(`photo_${c.id}`)),
    };
    const { error } = await supabase.from("candidates").update(row).eq("id", c.id);
    if (error) return fail(`${c.nom} : ${pgError(error)}`);
  }
  revalidatePath("/", "layout");
  return ok("Candidats enregistrés.");
}

export async function addCandidate(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const nom = String(form.get("nom") ?? "").trim();
  const id =
    String(form.get("id") ?? "").trim().toLowerCase() ||
    nom.split(" ").slice(-1)[0].normalize("NFD").replace(/[^a-z]/gi, "").toLowerCase();
  if (!nom || !/^[a-z0-9_-]{2,30}$/.test(id)) return fail("Nom et identifiant (lettres minuscules) obligatoires.");
  const { error } = await supabase.from("candidates").insert({
    id, nom, parti: String(form.get("parti") ?? "").trim(), couleur: String(form.get("couleur") ?? "#888888"),
    ordre: Number(form.get("ordre") ?? 100) || 100,
    photo: photoUrl(form.get("photo")),
  });
  if (error) return fail(pgError(error));
  revalidatePath("/", "layout");
  return ok(`${nom} ajouté (id : ${id}).`);
}

export async function addPoll(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Date invalide.");
  const valeurs: Record<string, number> = {};
  for (const c of await getCandidates(true)) {
    const v = num(form.get(`v_${c.id}`));
    if (v != null) valeurs[c.id] = v;
  }
  if (!Object.keys(valeurs).length) return fail("Saisis au moins une valeur.");
  const { error } = await supabase.from("polls").insert({
    date, valeurs, source: String(form.get("source") ?? "Votons-2027").trim() || "Votons-2027",
    url: String(form.get("url") ?? "").trim() || null,
  });
  if (error) return fail(pgError(error));
  revalidatePath("/", "layout");
  return ok(`Sondage du ${date} ajouté.`);
}

export async function deletePoll(form: FormData) {
  const { supabase } = await requireSuperadmin();
  await supabase.from("polls").delete().eq("id", Number(form.get("id")));
  revalidatePath("/", "layout");
}

export async function saveResults(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const cands = await getCandidates(true);
  const scores: Record<string, number> = {};
  for (const c of cands) {
    const v = num(form.get(`r_${c.id}`), 2);
    if (v != null) scores[c.id] = v;
  }
  const gagnant = String(form.get("gagnant") ?? "") || null;
  if (gagnant && !cands.some((c) => c.id === gagnant)) return fail("Vainqueur inconnu.");
  const { error } = await supabase.from("results").upsert({
    id: "officiel", scores, gagnant,
    participation: num(form.get("participation"), 2),
    score_gagnant: num(form.get("score_gagnant"), 2),
  });
  if (error) return fail(pgError(error));
  revalidatePath("/", "layout");
  return ok("Résultats officiels enregistrés : tous les classements sont à jour.");
}
