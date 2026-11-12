"use client";

import { useActionState, useState } from "react";
import { addCandidate, addParrainages, addPoll, importQuiz, saveCandidates, saveResults } from "@/app/actions/admin";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { fmtNum } from "@/lib/format";
import type { Candidate, Results } from "@/lib/types";

export function PollForm({ candidates, last, today }: { candidates: Candidate[]; last: Record<string, number>; today: string }) {
  const [state, action] = useActionState(addPoll, null);
  return (
    <form action={action} className="stack">
      <div className="grid3">
        <div><label>Date</label><input type="date" name="date" defaultValue={today} required /></div>
        <div><label>Source</label><input name="source" defaultValue="Votons-2027" /></div>
        <div><label>Lien</label><input name="url" defaultValue="https://votons-2027.fr/sondages" /></div>
      </div>
      <div className="cands">
        {candidates.filter((c) => c.actif).map((c) => (
          <div className="cand nocap" key={c.id}>
            <span className="dot" style={{ background: c.couleur }} />
            <div className="nm"><b>{c.nom}</b><small>précédent : {last[c.id] != null ? fmtNum(last[c.id]) : "n.c."}</small></div>
            <input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield" name={`v_${c.id}`} aria-label={c.nom} />
          </div>
        ))}
      </div>
      <div className="row"><SubmitButton>Ajouter ce relevé</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  );
}

export function CandidatesForm({ candidates }: { candidates: Candidate[] }) {
  const [state, action] = useActionState(saveCandidates, null);
  return (
    <form action={action} className="stack">
      <div className="tbl">
        <table>
          <thead><tr><th>Ordre</th><th>Nom</th><th>Parti</th><th>Couleur</th><th>Portrait (URL)</th><th>Actif</th></tr></thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td style={{ width: 70 }}><input type="number" name={`ordre_${c.id}`} defaultValue={c.ordre} /></td>
                <td style={{ minWidth: 160 }}><input name={`nom_${c.id}`} defaultValue={c.nom} /><small className="hint mono">{c.id}</small></td>
                <td style={{ minWidth: 140 }}><input name={`parti_${c.id}`} defaultValue={c.parti} /></td>
                <td style={{ width: 64 }}><input type="color" name={`couleur_${c.id}`} defaultValue={c.couleur} /></td>
                <td style={{ minWidth: 180 }}><input type="url" name={`photo_${c.id}`} defaultValue={c.photo ?? ""} placeholder="https://…" /></td>
                <td><input type="checkbox" name={`actif_${c.id}`} defaultChecked={c.actif} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row"><SubmitButton className="btn ghost">Enregistrer les candidats</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  );
}

export function AddCandidateForm() {
  const [state, action] = useActionState(addCandidate, null);
  return (
    <form action={action} className="stack">
      <div className="grid3">
        <div><label>Nom complet</label><input name="nom" required /></div>
        <div><label>Identifiant</label><input name="id" placeholder="auto : nom de famille" pattern="[a-z0-9_-]{2,30}" /></div>
        <div><label>Parti</label><input name="parti" /></div>
        <div><label>Couleur</label><input type="color" name="couleur" defaultValue="#888888" /></div>
        <div><label>Ordre</label><input type="number" name="ordre" defaultValue={100} /></div>
        <div><label>Portrait (URL)</label><input type="url" name="photo" placeholder="https://…" /></div>
      </div>
      <div className="row"><SubmitButton className="btn ghost">Ajouter</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  );
}

export function ResultsForm({ candidates, results }: { candidates: Candidate[]; results: Results | null }) {
  const [state, action] = useActionState(saveResults, null);
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(candidates.map((c) => [c.id, results?.scores?.[c.id] != null ? String(results.scores[c.id]) : ""])),
  );
  const top = candidates
    .filter((c) => scores[c.id] !== "" && !Number.isNaN(parseFloat(scores[c.id])))
    .sort((a, b) => parseFloat(scores[b.id]) - parseFloat(scores[a.id]))
    .slice(0, 2);
  return (
    <form action={action} className="stack">
      <h3>1er tour</h3>
      <div className="cands">
        {candidates.map((c) => (
          <div className="cand nocap" key={c.id}>
            <span className="dot" style={{ background: c.couleur }} />
            <div className="nm"><b>{c.nom}</b><small>{c.parti}</small></div>
            <input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield" name={`r_${c.id}`} aria-label={c.nom}
              value={scores[c.id]} onChange={(e) => setScores((s) => ({ ...s, [c.id]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div className="grid3">
        <div><label>Participation (%)</label><input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield" name="participation" defaultValue={results?.participation ?? ""} /></div>
      </div>
      <h3>2nd tour</h3>
      <div className="grid3">
        <div>
          <label>Élu·e</label>
          <select name="gagnant" defaultValue={results?.gagnant ?? ""}>
            <option value="">{top.length === 2 ? "Pas encore connu" : "Saisis d'abord le 1er tour"}</option>
            {top.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div><label>Score (%)</label><input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield" name="score_gagnant" defaultValue={results?.score_gagnant ?? ""} /></div>
        <div><label>Participation 2nd tour (%)</label><input type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield" name="participation_t2" defaultValue={results?.participation_t2 ?? ""} /></div>
      </div>
      <div className="row"><SubmitButton>Enregistrer les résultats</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  );
}

export function ParrainagesForm({ candidates, last, today }: { candidates: Candidate[]; last: Record<string, number>; today: string }) {
  const [state, action] = useActionState(addParrainages, null);
  return (
    <form action={action} className="stack">
      <div className="grid3">
        <div><label>Date de publication</label><input type="date" name="date" defaultValue={today} required /></div>
      </div>
      <div className="cands">
        {candidates.map((c) => (
          <div className="cand nocap" key={c.id}>
            <span className="dot" style={{ background: c.couleur }} />
            <div className="nm"><b>{c.nom}</b><small>précédent : {last[c.id] ?? "n.c."}</small></div>
            <input type="text" inputMode="numeric" pattern="[0-9]+" className="numfield" name={`p_${c.id}`} aria-label={c.nom} defaultValue={last[c.id] ?? ""} />
          </div>
        ))}
      </div>
      <div className="row"><SubmitButton>Enregistrer ce relevé</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  );
}

export function QuizImportForm({ example }: { example: string }) {
  const [state, action] = useActionState(importQuiz, null);
  const [json, setJson] = useState("");
  return (
    <form action={action} className="stack">
      <textarea name="json" value={json} onChange={(e) => setJson(e.target.value)} rows={12} spellCheck={false}
        style={{ fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace" }} placeholder={example} required />
      <div className="row">
        <SubmitButton>Publier le quiz</SubmitButton>
        <button type="button" className="btn ghost small" onClick={() => setJson(example)}>Charger le modèle</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
