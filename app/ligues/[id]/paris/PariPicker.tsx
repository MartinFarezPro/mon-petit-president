"use client";

import { useEffect, useState, useTransition } from "react";
import { savePari } from "@/app/actions/paris";
import { Portrait } from "@/components/Portrait";
import { shortName } from "@/lib/format";
import { precocite, type Pari } from "@/lib/paris";
import type { Candidate } from "@/lib/types";

type Cand = Pick<Candidate, "id" | "nom" | "couleur" | "photo">;

/** Choix d'un pari ouvert : enregistré à chaque touche, avec la valeur du pari qui baisse jusqu'à la clôture. */
export function PariPicker({ pari, candidates, initial, leagueId, onSave = savePari }: {
  pari: Pari; candidates: Cand[]; initial: { reponse: string[]; updated_at: string } | null; leagueId: string;
  onSave?: typeof savePari;
}) {
  const [sel, setSel] = useState<string[]>(initial?.reponse ?? []);
  const [at, setAt] = useState<string | null>(initial?.updated_at ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const multi = pari.kind === "candidats";
  function toggle(id: string | null) {
    const next = id === null ? [] : multi ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : sel[0] === id ? [] : [id];
    save(next);
  }
  function save(next: string[]) {
    const prev = sel;
    setSel(next);
    setErr(null);
    setSaved(false);
    start(async () => {
      const r = await onSave(pari.id, next, leagueId);
      if (!r.ok) {
        setSel(prev);
        setErr(r.error);
        return;
      }
      setAt(r.updated_at);
      setSaved(true);
    });
  }

  const value = now ? precocite(pari, at && (multi || sel.length) ? at : now) : null;
  const placed = multi ? at !== null : sel.length > 0;

  return (
    <div className="stack" style={{ gap: 10 }}>
      {pari.kind === "choix" ? (
        <div className="pills" role="group" aria-label={pari.question}>
          {pari.choix!.map((c) => (
            <button key={c.id} type="button" className="pill" aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)} disabled={pending}>
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="faces" role="group" aria-label={pari.question}>
          {candidates.map((c) => (
            <button key={c.id} type="button" className="face" aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)}
              style={{ "--c": c.couleur } as React.CSSProperties} disabled={pending}>
              <Portrait c={c} size={44} />
              <span>{shortName(c.nom)}</span>
              {sel.includes(c.id) && <i aria-hidden="true">{multi ? "✓" : "★"}</i>}
            </button>
          ))}
        </div>
      )}
      {multi && (
        <button type="button" className="pill" style={{ alignSelf: "flex-start" }} aria-pressed={placed && sel.length === 0}
          onClick={() => toggle(null)} disabled={pending}>
          🙅 Personne
        </button>
      )}
      <div className="spread pari-foot">
        <span className={placed ? "chip ok" : "chip warn"}>
          {pending ? "Enregistrement…" : placed ? (saved ? "Pari enregistré ✓" : multi && !sel.length ? "Pari : personne" : "Pari placé") : "Pas encore parié"}
        </span>
        {value != null && (
          <span className="valeur" title="Plus tu paries tôt, plus ton pari vaut cher : 100 % à l'ouverture, 80 % à la dernière seconde. Changer d'avis remet le compteur à l'heure.">
            {placed ? "Ton pari vaut" : "Si tu paries maintenant"} <b>{(Math.round(value * 1000) / 10).toLocaleString("fr-FR")} %</b>
            <span className="meter" aria-hidden="true"><span style={{ width: `${((value - 0.8) / 0.2) * 100}%` }} /></span>
          </span>
        )}
      </div>
      {err && <p className="notice err">{err}</p>}
    </div>
  );
}
