"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";
import { fail, ok, pgError, type FormState } from "./state";

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser("/profil");
  const pseudo = String(form.get("pseudo") ?? "").trim().slice(0, 30);
  const equipe = String(form.get("equipe") ?? "").trim().slice(0, 40);
  const couleur = String(form.get("couleur") ?? "#1f3fbf");
  const avatar = String(form.get("avatar") ?? "").slice(0, 16) || null;
  if (!pseudo) return fail("Choisis un pseudo.");
  if (!/^#[0-9a-fA-F]{6}$/.test(couleur)) return fail("Couleur invalide.");
  const { error } = await supabase.from("profiles").update({ pseudo, equipe, couleur, avatar }).eq("id", userId);
  if (error) return fail(pgError(error));
  revalidatePath("/", "layout");
  const next = String(form.get("next") ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  return ok("Profil enregistré.");
}
