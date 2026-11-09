"use client";

import { useActionState, useMemo, useState } from "react";
import { saveFinalPick } from "@/app/actions/picks";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { FAVORIS, PARTICIPATION_2022 } from "@/lib/constants";
import { fmtNum } from "@/lib/format";
import type { Candidate, FinalPick } from "@/lib/types";

const parse = (v: string) => {
  const x = parseFloat(v.replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

export function PickForm({ leagueId, candidates, poll, pick, locked }: {
  leagueId: string; candidates: Candidate[]; poll: Record<string, number>; pick: FinalPick | null; locked: boolean;
}) {
  const [state, action] = useActionState(saveFinalPick, null);
  const [q1, setQ1] = useState(pick?.q1 ?? "");
  const [q2, setQ2] = useState(pick?.q2 ?? "");
  const [gagnant, setGagnant] = useState(pick?.gagnant ?? "");
  const [captain, setCaptain] = useState(pick?.capitaine ?? "");
  // Champs contrôlés : React réinitialise les champs non contrôlés après chaque envoi, même en cas d'erreur
  const [scoreGagnant, setScoreGagnant] = useState(pick?.score_gagnant != null ? String(pick.score_gagnant) : "");
  const [surprise, setSurprise] = useState(pick?.surprise ?? "");
  const [participation, setParticipation] = useState(pick?.participation != null ? String(pick.participation) : "");
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(candidates.map((c) => [c.id, pick?.scores?.[c.id] != null ? String(pick.scores[c.id]) : ""])),
  );
  const total = useMemo(() => Object.values(scores).reduce((a, v) => a + parse(v), 0), [scores]);
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));
  const finalists = [q1, q2].filter(Boolean);
  const g = finalists.includes(gagnant) ? gagnant : "";
  const dis = locked;

  return (
    <form action={action} className="stack">
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="capitaine" value={captain} />

      <section className="card stack">
        <div className="section-h"><h2>Le second tour</h2><span className="pts">jusqu&apos;à 60 pts</span></div>
        <p className="hint">Qui seront les deux qualifiés ? Le premier est celui que tu vois arriver en tête au 1er tour.</p>
        <div className="grid2">
          <div>
            <label htmlFor="q1">Arrive 1er au 1er tour</label>
            <select id="q1" name="q1" value={q1} onChange={(e) => setQ1(e.target.value)} disabled={dis}>
              <option value="">Choisir…</option>
              {candidates.map((c) => <option key={c.id} value={c.id} disabled={c.id === q2}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="q2">Arrive 2e au 1er tour</label>
            <select id="q2" name="q2" value={q2} onChange={(e) => setQ2(e.target.value)} disabled={dis}>
              <option value="">Choisir…</option>
              {candidates.map((c) => <option key={c.id} value={c.id} disabled={c.id === q1}>{c.nom}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Le vainqueur</h2><span className="pts">jusqu&apos;à 60 pts</span></div>
        <div className="grid2">
          <div>
            <label htmlFor="gagnant">Élu·e le 2 mai</label>
            <select id="gagnant" name="gagnant" value={g} onChange={(e) => setGagnant(e.target.value)} disabled={dis || finalists.length < 2}>
              <option value="">{finalists.length < 2 ? "Choisis d'abord tes 2 qualifiés" : "Choisir…"}</option>
              {finalists.map((id) => <option key={id} value={id}>{byId[id]?.nom}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="score_gagnant">Son score au 2nd tour (%)</label>
            <input id="score_gagnant" name="score_gagnant" type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield"
              placeholder="52,5" value={scoreGagnant} onChange={(e) => setScoreGagnant(e.target.value)} disabled={dis} />
          </div>
        </div>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Les scores du 1er tour</h2><span className="pts">10 pts par candidat</span></div>
        <p className="hint">
          Mets ton % pour chaque candidat (le chiffre gris = moyenne des sondages). Touche <b>C</b> pour désigner ton capitaine : ses points comptent double.
        </p>
        <div className="cands">
          {candidates.map((c) => (
            <div className="cand" key={c.id}>
              <span className="dot" style={{ background: c.couleur }} />
              <div className="nm">
                <b>{c.nom}</b>
                <small>{c.parti}{poll[c.id] != null ? ` · sondages ${fmtNum(poll[c.id])} %` : ""}</small>
              </div>
              <input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield" name={`score_${c.id}`}
                aria-label={`Score de ${c.nom} en %`} placeholder={poll[c.id] != null ? fmtNum(poll[c.id]) : "%"}
                value={scores[c.id]} onChange={(e) => setScores((s) => ({ ...s, [c.id]: e.target.value }))} disabled={dis} />
              <button type="button" className="cap" aria-pressed={captain === c.id} title={`${c.nom} capitaine`}
                aria-label={`Désigner ${c.nom} capitaine`} disabled={dis}
                onClick={() => setCaptain((x) => (x === c.id ? "" : c.id))}>C</button>
            </div>
          ))}
        </div>
        <div className={total > 100.05 ? "sumbar over" : "sumbar"}>
          <span>Total saisi{captain ? ` · capitaine : ${byId[captain]?.nom}` : ""}</span>
          <span>{fmtNum(total)} %</span>
        </div>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Les bonus</h2><span className="pts">jusqu&apos;à 30 pts</span></div>
        <div className="grid2">
          <div>
            <label htmlFor="surprise">La surprise</label>
            <select id="surprise" name="surprise" value={surprise} onChange={(e) => setSurprise(e.target.value)} disabled={dis}>
              <option value="">Choisir…</option>
              {candidates.filter((c) => !(FAVORIS as readonly string[]).includes(c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            <p className="hint" style={{ marginTop: 4 }}>Le mieux classé hors des 4 favoris des sondages.</p>
          </div>
          <div>
            <label htmlFor="participation">Participation au 1er tour (%)</label>
            <input id="participation" name="participation" type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield"
              placeholder="74,0" value={participation} onChange={(e) => setParticipation(e.target.value)} disabled={dis} />
            <p className="hint" style={{ marginTop: 4 }}>2022 : {fmtNum(PARTICIPATION_2022)} %.</p>
          </div>
        </div>
      </section>

      {!locked && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row"><SubmitButton disabled={total > 100.05}>Valider mon prono</SubmitButton></div>
          <FormMessage state={state} />
        </div>
      )}
    </form>
  );
}
