// Supabase Edge Function : reçoit le relevé hebdo des sondages (tâche planifiée du lundi).
// Déploiement : supabase functions deploy ingest-poll --no-verify-jwt
// Secret      : supabase secrets set INGEST_SECRET=<une longue chaîne aléatoire>
//
// Appel :
//   POST https://<projet>.supabase.co/functions/v1/ingest-poll
//   Header  x-ingest-secret: <INGEST_SECRET>
//   Body    {"date":"2026-11-16","source":"Votons-2027","url":"https://votons-2027.fr/sondages",
//            "valeurs":{"lepen":33.5,"melenchon":16.8,...}}
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST uniquement" });
  const secret = Deno.env.get("INGEST_SECRET");
  if (!secret || req.headers.get("x-ingest-secret") !== secret) return json(401, { error: "secret invalide" });

  let body: { date?: string; source?: string; url?: string; valeurs?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "JSON invalide" });
  }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return json(400, { error: "date AAAA-MM-JJ requise" });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cands } = await supabase.from("candidates").select("id");
  const known = new Set((cands ?? []).map((c) => c.id));

  const valeurs: Record<string, number> = {};
  const ignores: string[] = [];
  for (const [k, v] of Object.entries(body.valeurs ?? {})) {
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    if (known.has(k) && Number.isFinite(n) && n >= 0 && n <= 100) valeurs[k] = Math.round(n * 10) / 10;
    else ignores.push(k);
  }
  if (!Object.keys(valeurs).length) return json(400, { error: "aucune valeur valide", ignores });

  // Un seul relevé par date et par source : on remplace s'il existe déjà
  const source = body.source?.trim() || "Votons-2027";
  await supabase.from("polls").delete().eq("date", body.date).eq("source", source);
  const { data, error } = await supabase
    .from("polls").insert({ date: body.date, source, url: body.url ?? null, valeurs }).select("id").single();
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true, id: data.id, candidats: Object.keys(valeurs).length, ignores });
});
