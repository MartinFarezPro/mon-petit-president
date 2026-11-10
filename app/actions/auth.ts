"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pathAfterLogin } from "@/lib/after-login";
import { fail, ok, type FormState } from "./state";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function safeNext(next: unknown) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/ligues";
}

export async function sendMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Adresse e-mail invalide.");
  const next = safeNext(form.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (/rate|limit/i.test(error.message)) return fail("Trop de demandes : réessaie dans quelques minutes.");
    return fail(error.message);
  }
  return ok(`E-mail envoyé à ${email}. Tape le code reçu ci-dessous, ou clique sur le lien.`);
}

export async function verifyCode(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!email) return fail("Redemande un code avec ton e-mail.");
  if (token.length < 6 || token.length > 8) return fail("Le code fait 6 chiffres.");
  const next = safeNext(form.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    if (/rate|limit/i.test(error.message)) return fail("Trop d'essais : réessaie dans quelques minutes.");
    return fail("Code invalide ou expiré. Vérifie-le ou demande un nouvel e-mail.");
  }
  redirect(await pathAfterLogin(supabase, next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
