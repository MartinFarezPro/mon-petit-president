"use client";

import { useEffect, useState, useTransition } from "react";
import { lockPari, savePari } from "@/app/actions/paris";
import { Portrait } from "@/components/Portrait";
import { fmtDateTime, shortName } from "@/lib/format";
import { precocite, PRECOCITE_MIN, type Pari } from "@/lib/paris";
import type { Candidate, PariReponse } from "@/lib/types";

type Cand = Pick<Candidate, "id" | "nom" | "couleur" | "photo">;
const pct = (v: number) => `${(Math.round(v * 1000) / 10).toLocaleString("fr-FR")} %`;

/**
 * Pari ouvert : le choix s'enregistre à chaque touche et reste modifiable,
 * jusqu'à ce que le joueur pose le cadenas (plus c'est tôt, plus il rapporte).
 */
export function PariPicker({ pari, candidates, initial, leagueId, onSave = savePari, onLock = lockPari }: {
  pari: Pari; candidates: Cand[]; initial: Pick<PariReponse, "reponse" | "verrouille_le"> | null; leagueId: string;
  onSave?: typeof savePari; onLock?: typeof lockPari;
}) {
  const [sel, setSel] = useState<string[]>(initial?.reponse ?? []);
  const [placed, setPlaced] = useState(!!initial);
  const [locked, setLocked] = useState<string | null>(initial?.verrouille_le ?? null);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const multi = pari.kind === "candidats";
  function toggle(id: string | null) {
    if (locked) return;
    const next = id === null ? [] : multi ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : sel[0] === id ? [] : [id];
    const prev = sel;
    setSel(next);
    setErr(null);
    setConfirm(false);
    start(async () => {
      const r = await onSave(pari.id, next, leagueId);
      if (!r.ok) {
        setSel(prev);
        setErr(r.error);
        return;
      }
      setPlaced(r.updated_at !== null);
    });
  }
  function lock() {
    setErr(null);
    start(async () => {
      const r = await onLock(pari.id, leagueId);
      setConfirm(false);
      if (!r.ok) return setErr(r.error);
      setLocked(r.verrouille_le);
    });
  }

  const value = locked ? precocite(pari, locked) : now ? precocite(pari, now) : null;
  const summary = !placed ? null : multi && !sel.length ? "Personne"
    : pari.kind === "choix" ? pari.choix!.filter((c) => sel.includes(c.id)).map((c) => c.label).join(", ")
    : candidates.filter((c) => sel.includes(c.id)).map((c) => shortName(c.nom)).join(", ");

  return (
    <div className={`stack picker ${locked ? "is-locked" : ""}`} style={{ gap: 10 }}>
      {pari.kind === "choix" ? (
        <div className="pills" role="group" aria-label={pari.question}>
          {pari.choix!.map((c) => (
            <button key={c.id} type="button" className="pill" aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)} disabled={pending || !!locked}>
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="faces" role="group" aria-label={pari.question}>
          {candidates.map((c) => (
            <button key={c.id} type="button" className="face" aria-pressed={sel.includes(c.id)} onClick={() => toggle(c.id)}
              style={{ "--c": c.couleur } as React.CSSProperties} disabled={pending || !!locked}>
              <Portrait c={c} size={44} />
              <span>{shortName(c.nom)}</span>
              {sel.includes(c.id) && <i aria-hidden="true">{multi ? "✓" : "★"}</i>}
            </button>
          ))}
        </div>
      )}
      {multi && (
        <button type="button" className="pill" style={{ alignSelf: "flex-start" }} aria-pressed={placed && sel.length === 0}
          onClick={() => toggle(null)} disabled={pending || !!locked}>
          🙅 Personne
        </button>
      )}

      {locked ? (
        <div className="lockbar done">
          <span className="lk-ic" aria-hidden="true">🔒</span>
          <div>
            <b>Verrouillé : {summary}</b>
            <small>Le {fmtDateTime(locked)} · ton pari vaut <b>{pct(value!)}</b> s&apos;il est bon</small>
          </div>
        </div>
      ) : !placed ? (
        <p className="hint">Choisis ta réponse : tu pourras la changer tant que tu ne l&apos;as pas verrouillée.</p>
      ) : confirm ? (
        <div className="lockbar ask">
          <div>
            <b>Verrouiller « {summary} » ?</b>
            <small>Tu ne pourras plus changer d&apos;avis. Ton pari vaudra {value != null ? pct(value) : "…"}.</small>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={lock} disabled={pending}>{pending ? "…" : "🔒 Oui, verrouiller"}</button>
            <button type="button" className="btn ghost" onClick={() => setConfirm(false)} disabled={pending}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="lockbar">
          <div>
            <b>{pending ? "Enregistrement…" : `Pari : ${summary}`}</b>
            <small>
              Pas encore verrouillé : il vaudra {pct(PRECOCITE_MIN)} à la clôture.
              {value != null && <> Verrouillé maintenant, il vaut <b>{pct(value)}</b>.</>}
            </small>
            {value != null && <span className="meter" aria-hidden="true"><span style={{ width: `${((value - PRECOCITE_MIN) / (1 - PRECOCITE_MIN)) * 100}%` }} /></span>}
          </div>
          <button type="button" className="btn lock-btn" onClick={() => setConfirm(true)} disabled={pending}>
            🔒 Verrouiller{value != null ? ` (${pct(value)})` : ""}
          </button>
        </div>
      )}
      {err && <p className="notice err">{err}</p>}
    </div>
  );
}
