export type FormState = { ok?: string; error?: string; at?: number } | null;

export const ok = (msg: string): FormState => ({ ok: msg, at: Date.now() });
export const fail = (msg: string): FormState => ({ error: msg, at: Date.now() });

/** Traduit les erreurs Postgres / RLS les plus courantes en français lisible. */
export function pgError(e: { message?: string; code?: string } | null | undefined, fallback = "Échec de l'enregistrement") {
  if (!e) return fallback;
  if (e.code === "42501" || /row-level security/i.test(e.message ?? "")) return "Action refusée (clôture passée ou droits insuffisants).";
  if (e.code === "23505") return "Cet élément existe déjà.";
  if (e.code === "23514") return "Valeur hors limites.";
  if (e.code === "P0001" && e.message) return e.message;
  return e.message || fallback;
}
