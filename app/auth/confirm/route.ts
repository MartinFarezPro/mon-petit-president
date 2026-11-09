import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lien magique : gère le flux PKCE (?code=) et le lien par token (?token_hash=&type=)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const nextParam = searchParams.get("next") ?? "/ligues";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/ligues";
  const supabase = await createClient();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }
  if (!ok) return NextResponse.redirect(`${origin}/connexion?erreur=lien&next=${encodeURIComponent(next)}`);

  // Premier passage : on propose de compléter le profil
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (uid) {
    const { data: p } = await supabase.from("profiles").select("equipe").eq("id", uid).maybeSingle();
    if (p && !p.equipe) return NextResponse.redirect(`${origin}/profil?bienvenue=1&next=${encodeURIComponent(next)}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
