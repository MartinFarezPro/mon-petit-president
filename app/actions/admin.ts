"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCandidates, requireUser } from "@/lib/data";
import { parisLocalToISO } from "@/lib/format";
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
    participation_t2: num(form.get("participation_t2"), 2),
    score_gagnant: num(form.get("score_gagnant"), 2),
  });
  if (error) return fail(pgError(error));
  revalidatePath("/", "layout");
  return ok("Résultats officiels enregistrés : tous les classements sont à jour.");
}

export async function addParrainages(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Date invalide.");
  const valeurs: Record<string, number> = {};
  for (const c of await getCandidates(true)) {
    const v = num(form.get(`p_${c.id}`), 0);
    if (v != null && v >= 0) valeurs[c.id] = v;
  }
  if (!Object.keys(valeurs).length) return fail("Saisis au moins un total.");
  const { error } = await supabase.from("parrainages").upsert({ date, valeurs });
  if (error) return fail(pgError(error));
  revalidatePath("/", "layout");
  return ok(`Parrainages du ${date} enregistrés : les paris concernés se mettent à jour tout seuls.`);
}

export async function deleteParrainages(form: FormData) {
  const { supabase } = await requireSuperadmin();
  await supabase.from("parrainages").delete().eq("date", String(form.get("date")));
  revalidatePath("/", "layout");
}

type QuizImport = {
  titre?: unknown; ouverture?: unknown; cloture?: unknown;
  questions?: { citation?: unknown; contexte?: unknown; date?: unknown; choix?: unknown; reponse?: unknown }[];
};

/** Mélange déterministe (pour que la bonne réponse ne soit pas toujours à la même place). */
function shuffle<T>(xs: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Importe un quiz complet depuis un JSON (voir le modèle dans /admin). */
export async function importQuiz(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  let data: QuizImport;
  try {
    data = JSON.parse(String(form.get("json") ?? ""));
  } catch {
    return fail("JSON invalide : vérifie les guillemets et les virgules.");
  }
  const ids = new Set((await getCandidates(true)).map((c) => c.id));
  const titre = String(data.titre ?? "").trim().slice(0, 80);
  const ouverture = parisLocalToISO(String(data.ouverture ?? ""));
  const cloture = parisLocalToISO(String(data.cloture ?? ""));
  if (!titre) return fail("Il manque le titre.");
  if (!ouverture || !cloture || cloture <= ouverture) return fail("Dates invalides (format 2026-11-16T08:00, clôture après ouverture).");
  const qs = Array.isArray(data.questions) ? data.questions : [];
  if (qs.length < 1 || qs.length > 15) return fail("Entre 1 et 15 questions.");

  const rows = [];
  for (const [i, q] of qs.entries()) {
    const n = `Question ${i + 1}`;
    const citation = String(q.citation ?? "").trim().replace(/^[«"“\s]+|[»"”\s]+$/g, "");
    const choix = Array.isArray(q.choix) ? q.choix.map(String) : [];
    const reponse = String(q.reponse ?? "");
    const date = String(q.date ?? "");
    if (!citation || citation.length > 500) return fail(`${n} : citation manquante ou trop longue (500 caractères max).`);
    if (choix.length < 2 || choix.length > 6 || new Set(choix).size !== choix.length) return fail(`${n} : 2 à 6 choix différents.`);
    const unknown = choix.filter((c) => !ids.has(c));
    if (unknown.length) return fail(`${n} : candidat inconnu (${unknown.join(", ")}). Utilise les identifiants de la liste.`);
    if (!choix.includes(reponse)) return fail(`${n} : la réponse doit faire partie des choix.`);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(`${n} : date au format AAAA-MM-JJ.`);
    rows.push({
      ordre: i, citation, contexte: String(q.contexte ?? "").trim().slice(0, 160),
      date_citation: date || null, choix: shuffle(choix, citation), reponse,
    });
  }

  const { data: quiz, error } = await supabase.from("quiz").insert({ titre, ouverture, cloture }).select("id").single();
  if (error) return fail(pgError(error));
  const { error: e2 } = await supabase.from("quiz_questions").insert(rows.map((r) => ({ ...r, quiz_id: quiz.id })));
  if (e2) {
    await supabase.from("quiz").delete().eq("id", quiz.id);
    return fail(pgError(e2));
  }
  revalidatePath("/", "layout");
  return ok(`Quiz « ${titre} » publié : ${rows.length} questions.`);
}

export async function deleteQuiz(form: FormData) {
  const { supabase } = await requireSuperadmin();
  await supabase.from("quiz").delete().eq("id", String(form.get("id")));
  revalidatePath("/", "layout");
}
