"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { pgError } from "./state";

export type QuizAnswer = { ok: true; bonne: string; monChoix: string } | { ok: false; error: string };

/** Répond à une question du quiz. La 1re réponse est définitive ; on reçoit la bonne réponse en retour. */
export async function answerQuiz(questionId: string, choix: string): Promise<QuizAnswer> {
  const { supabase } = await requireUser("/ligues");
  if (!/^[0-9a-f-]{36}$/i.test(questionId)) return { ok: false, error: "Question inconnue." };
  const { data, error } = await supabase.rpc("quiz_repondre", { p_question: questionId, p_choix: choix });
  if (error) return { ok: false, error: pgError(error) };
  const row = (data as { bonne: string; mon_choix: string }[] | null)?.[0];
  if (!row) return { ok: false, error: "Réponse non enregistrée." };
  return { ok: true, bonne: row.bonne, monChoix: row.mon_choix };
}

/** Rafraîchit les pages de ligue une fois le quiz terminé (classement, onglet, série). */
export async function quizDone() {
  await requireUser("/ligues");
  revalidatePath("/ligues", "layout");
}
