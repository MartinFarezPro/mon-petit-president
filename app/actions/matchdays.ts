"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { parisLocalToISO } from "@/lib/format";
import type { Question } from "@/lib/types";
import { fail, ok, pgError, type FormState } from "./state";

export async function answerMatchday(_prev: FormState, form: FormData): Promise<FormState> {
  const leagueId = String(form.get("league_id"));
  const matchdayId = String(form.get("matchday_id"));
  const { supabase, userId } = await requireUser(`/ligues/${leagueId}/journees`);

  const { data: md } = await supabase.from("matchdays").select("*").eq("id", matchdayId).maybeSingle();
  if (!md) return fail("Journée introuvable.");
  const { data: qs } = await supabase.from("questions").select("*").eq("matchday_id", matchdayId);
  const now = Date.now();
  const rows: { question_id: string; user_id: string; reponse: string | number }[] = [];
  for (const q of (qs ?? []) as Question[]) {
    const raw = form.get(`q_${q.id}`);
    if (raw == null || String(raw).trim() === "") continue;
    const cloture = new Date(q.cloture ?? md.cloture).getTime();
    if (now < new Date(md.ouverture).getTime() || now >= cloture) continue;
    if (q.type === "nombre") {
      const n = parseFloat(String(raw).replace(",", "."));
      if (!Number.isFinite(n)) return fail(`Réponse invalide pour « ${q.intitule} ».`);
      rows.push({ question_id: q.id, user_id: userId, reponse: n });
    } else {
      const v = String(raw);
      if (!(q.options?.choix ?? []).includes(v)) return fail(`Réponse invalide pour « ${q.intitule} ».`);
      rows.push({ question_id: q.id, user_id: userId, reponse: v });
    }
  }
  if (!rows.length) return fail("Aucune réponse à enregistrer (questions closes ?).");
  const { error } = await supabase.from("answers").upsert(rows, { onConflict: "question_id,user_id" });
  if (error) return fail(pgError(error));
  revalidatePath(`/ligues/${leagueId}`, "layout");
  return ok(`${rows.length} réponse${rows.length > 1 ? "s" : ""} enregistrée${rows.length > 1 ? "s" : ""}.`);
}

type QuestionDraft = {
  id?: string;
  intitule: string;
  type: "choix" | "nombre";
  choix?: string[];
  tolerance?: number | null;
  unite?: string;
  points?: number;
  cloture?: string | null;
};

export async function saveMatchday(_prev: FormState, form: FormData): Promise<FormState> {
  const leagueId = String(form.get("league_id"));
  const matchdayId = String(form.get("matchday_id") ?? "") || null;
  const { supabase } = await requireUser(`/ligues/${leagueId}/admin`);

  const titre = String(form.get("titre") ?? "").trim().slice(0, 80);
  const ouverture = parisLocalToISO(String(form.get("ouverture") ?? ""));
  const cloture = parisLocalToISO(String(form.get("cloture") ?? ""));
  if (!titre) return fail("Donne un titre à la journée.");
  if (!ouverture || !cloture) return fail("Dates d'ouverture et de clôture obligatoires.");
  if (new Date(cloture) <= new Date(ouverture)) return fail("La clôture doit suivre l'ouverture.");

  let drafts: QuestionDraft[];
  try {
    drafts = JSON.parse(String(form.get("questions") ?? "[]"));
  } catch {
    return fail("Questions illisibles.");
  }
  drafts = drafts.filter((q) => q.intitule?.trim());
  if (drafts.length < 1 || drafts.length > 8) return fail("Entre 1 et 8 questions (idéalement 3 à 5).");
  for (const q of drafts) {
    if (q.type === "choix" && (q.choix ?? []).filter(Boolean).length < 2) {
      return fail(`« ${q.intitule} » : il faut au moins 2 choix.`);
    }
  }

  let id = matchdayId;
  if (id) {
    const { error } = await supabase.from("matchdays").update({ titre, ouverture, cloture }).eq("id", id);
    if (error) return fail(pgError(error));
  } else {
    const { data, error } = await supabase
      .from("matchdays").insert({ league_id: leagueId, titre, ouverture, cloture }).select("id").single();
    if (error) return fail(pgError(error));
    id = data.id as string;
  }

  const keep = drafts.filter((q) => q.id).map((q) => q.id as string);
  const { data: existing } = await supabase.from("questions").select("id").eq("matchday_id", id);
  const toDelete = (existing ?? []).map((q) => q.id as string).filter((x) => !keep.includes(x));
  if (toDelete.length) await supabase.from("questions").delete().in("id", toDelete);

  for (const [i, q] of drafts.entries()) {
    const row = {
      matchday_id: id,
      intitule: q.intitule.trim().slice(0, 200),
      type: q.type,
      options:
        q.type === "choix"
          ? { choix: Array.from(new Set((q.choix ?? []).map((c) => c.trim()).filter(Boolean))).slice(0, 20) }
          : { tolerance: Math.max(0, Number(q.tolerance ?? 0)), unite: (q.unite ?? "").slice(0, 10) },
      points: Math.min(100, Math.max(1, Number(q.points ?? 10))),
      cloture: q.cloture ? parisLocalToISO(q.cloture) : null,
      ordre: i,
    };
    const { error } = q.id
      ? await supabase.from("questions").update(row).eq("id", q.id)
      : await supabase.from("questions").insert(row);
    if (error) return fail(pgError(error));
  }

  revalidatePath(`/ligues/${leagueId}`, "layout");
  redirect(`/ligues/${leagueId}/admin?ok=journee#j-${id}`);
}

export async function saveCorrections(_prev: FormState, form: FormData): Promise<FormState> {
  const leagueId = String(form.get("league_id"));
  const matchdayId = String(form.get("matchday_id"));
  const { supabase } = await requireUser(`/ligues/${leagueId}/admin`);
  const { data: qs } = await supabase.from("questions").select("*").eq("matchday_id", matchdayId);
  for (const q of (qs ?? []) as Question[]) {
    let bonne: string[] | number | null = null;
    if (q.type === "choix") {
      const vals = form.getAll(`bonne_${q.id}`).map(String).filter((v) => (q.options?.choix ?? []).includes(v));
      bonne = vals.length ? vals : null;
    } else {
      const raw = String(form.get(`bonne_${q.id}`) ?? "").trim();
      const n = parseFloat(raw.replace(",", "."));
      bonne = raw && Number.isFinite(n) ? n : null;
    }
    const { error } = await supabase.from("questions").update({ bonne_reponse: bonne }).eq("id", q.id);
    if (error) return fail(pgError(error));
  }
  revalidatePath(`/ligues/${leagueId}`, "layout");
  return ok("Bonnes réponses enregistrées : le classement est à jour.");
}

export async function deleteMatchday(form: FormData) {
  const leagueId = String(form.get("league_id"));
  const { supabase } = await requireUser(`/ligues/${leagueId}/admin`);
  await supabase.from("matchdays").delete().eq("id", String(form.get("matchday_id")));
  revalidatePath(`/ligues/${leagueId}`, "layout");
  redirect(`/ligues/${leagueId}/admin`);
}
