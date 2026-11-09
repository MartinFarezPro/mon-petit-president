"use client";

import { useActionState, useState } from "react";
import { renameLeague } from "@/app/actions/leagues";
import { saveCorrections, saveMatchday } from "@/app/actions/matchdays";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import type { Question } from "@/lib/types";

export function CopyButton({ text, label, className = "btn" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          if (navigator.share && /Mobi/i.test(navigator.userAgent) && label.includes("message")) {
            await navigator.share({ text });
          } else {
            await navigator.clipboard.writeText(text);
          }
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {}
      }}
    >
      {done ? "Copié ✓" : label}
    </button>
  );
}

export function RenameForm({ leagueId, nom }: { leagueId: string; nom: string }) {
  const [state, action] = useActionState(renameLeague, null);
  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="league_id" value={leagueId} />
      <label htmlFor="nom">Nom de la ligue</label>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input id="nom" name="nom" defaultValue={nom} maxLength={60} required />
        <SubmitButton className="btn ghost">Renommer</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

type Draft = {
  id?: string;
  intitule: string;
  type: "choix" | "nombre";
  choix: string[];
  tolerance: number | null;
  unite: string;
  points: number;
  cloture: string;
};

const blank = (): Draft => ({ intitule: "", type: "choix", choix: [], tolerance: 2, unite: "", points: 10, cloture: "" });

const MODELES: { label: string; make: (cands: string[]) => Draft }[] = [
  { label: "Qui monte le plus ?", make: (c) => ({ ...blank(), intitule: "Qui gagne le plus de points dans les sondages cette semaine ?", choix: c }) },
  { label: "Score dans un sondage", make: () => ({ ...blank(), intitule: "Score de Marine Le Pen dans la moyenne de lundi prochain ?", type: "nombre", tolerance: 2, unite: "%" }) },
  { label: "Qui se déclare ?", make: () => ({ ...blank(), intitule: "Qui se déclare candidat cette semaine ?", choix: ["Personne", "François Hollande", "Autre"] }) },
  { label: "500 parrainages", make: (c) => ({ ...blank(), intitule: "Qui annonce en premier ses 500 parrainages ?", choix: c }) },
  { label: "Qui gagne le débat ?", make: (c) => ({ ...blank(), intitule: "Qui est jugé le plus convaincant au débat (sondage à chaud) ?", choix: c.slice(0, 6) }) },
  { label: "Oui / Non", make: () => ({ ...blank(), intitule: "", choix: ["Oui", "Non"] }) },
];

export function MatchdayEditor({ leagueId, candidateNames, matchdayId, defaults }: {
  leagueId: string;
  candidateNames: string[];
  matchdayId?: string;
  defaults: { titre: string; ouverture: string; cloture: string; questions?: Draft[] };
}) {
  const [state, action] = useActionState(saveMatchday, null);
  const [qs, setQs] = useState<Draft[]>(defaults.questions?.length ? defaults.questions : [blank()]);
  const set = (i: number, patch: Partial<Draft>) => setQs((arr) => arr.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <form action={action} className="stack">
      <input type="hidden" name="league_id" value={leagueId} />
      {matchdayId && <input type="hidden" name="matchday_id" value={matchdayId} />}
      <input type="hidden" name="questions" value={JSON.stringify(qs)} />
      <div className="grid3">
        <div><label>Titre</label><input name="titre" defaultValue={defaults.titre} required maxLength={80} /></div>
        <div><label>Ouverture (heure de Paris)</label><input type="datetime-local" name="ouverture" defaultValue={defaults.ouverture} required /></div>
        <div><label>Clôture (heure de Paris)</label><input type="datetime-local" name="cloture" defaultValue={defaults.cloture} required /></div>
      </div>

      {!matchdayId && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="hint">Modèles rapides :</span>
          <div className="chips">
            {MODELES.map((m) => (
              <button key={m.label} type="button" className="react" onClick={() =>
                setQs((arr) => [...arr.filter((q) => q.intitule.trim()), m.make(candidateNames)].slice(0, 8))}>
                + {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {qs.map((q, i) => (
        <div key={i} className="question">
          <div className="spread">
            <b>Question {i + 1}</b>
            {qs.length > 1 && <button type="button" className="linkbtn" onClick={() => setQs((a) => a.filter((_, j) => j !== i))}>Retirer</button>}
          </div>
          <input value={q.intitule} onChange={(e) => set(i, { intitule: e.target.value })} placeholder="Intitulé de la question" maxLength={200} aria-label="Intitulé" />
          <div className="grid3">
            <div>
              <label>Type</label>
              <select value={q.type} onChange={(e) => set(i, { type: e.target.value as Draft["type"] })}>
                <option value="choix">Choix</option>
                <option value="nombre">Nombre</option>
              </select>
            </div>
            <div><label>Points</label><input type="number" min={1} max={100} value={q.points} onChange={(e) => set(i, { points: Number(e.target.value) })} /></div>
            <div>
              <label>Clôture propre (option.)</label>
              <input type="datetime-local" value={q.cloture} onChange={(e) => set(i, { cloture: e.target.value })} />
            </div>
          </div>
          {q.type === "choix" ? (
            <div>
              <div className="spread">
                <label>Choix (un par ligne)</label>
                <button type="button" className="linkbtn" onClick={() => set(i, { choix: candidateNames })}>Remplir avec les candidats</button>
              </div>
              <textarea value={q.choix.join("\n")} rows={Math.min(8, Math.max(3, q.choix.length))}
                onChange={(e) => set(i, { choix: e.target.value.split("\n") })} />
            </div>
          ) : (
            <div className="grid3">
              <div><label>Tolérance (0 = exact)</label><input type="number" min={0} step="any" value={q.tolerance ?? 0} onChange={(e) => set(i, { tolerance: Number(e.target.value) })} /></div>
              <div><label>Unité</label><input value={q.unite} maxLength={10} placeholder="%" onChange={(e) => set(i, { unite: e.target.value })} /></div>
            </div>
          )}
        </div>
      ))}
      {qs.length < 8 && <button type="button" className="btn ghost small" onClick={() => setQs((a) => [...a, blank()])}>+ Ajouter une question</button>}
      {matchdayId && <p className="hint">Retirer une question supprime aussi les réponses déjà données.</p>}
      <div className="row"><SubmitButton>{matchdayId ? "Enregistrer les modifications" : "Créer la journée"}</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  );
}

export function CorrectionForm({ leagueId, matchdayId, questions }: { leagueId: string; matchdayId: string; questions: Question[] }) {
  const [state, action] = useActionState(saveCorrections, null);
  if (!questions.length) return <p className="hint">Aucune question.</p>;
  return (
    <form action={action} className="stack">
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="matchday_id" value={matchdayId} />
      {questions.map((q) => {
        const good = Array.isArray(q.bonne_reponse) ? q.bonne_reponse : [];
        return (
          <div key={q.id} className="stack" style={{ gap: 6 }}>
            <b style={{ fontSize: 14 }}>{q.intitule}</b>
            {q.type === "choix" ? (
              <div className="options">
                {(q.options.choix ?? []).map((opt) => (
                  <label key={opt} className="opt" style={{ margin: 0 }}>
                    <input type="checkbox" name={`bonne_${q.id}`} value={opt} defaultChecked={good.includes(opt)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="row" style={{ maxWidth: 240 }}>
                <input type="text" inputMode="decimal" pattern="-?[0-9]+([.,][0-9]+)?" className="numfield" name={`bonne_${q.id}`} defaultValue={typeof q.bonne_reponse === "number" ? q.bonne_reponse : ""} />
                {q.options.unite && <span className="hint">{q.options.unite}</span>}
              </div>
            )}
          </div>
        );
      })}
      <p className="hint">Plusieurs cases possibles si plusieurs réponses sont justes. Laisse vide pour « pas encore connu ».</p>
      <div className="row"><SubmitButton className="btn ghost">Enregistrer les bonnes réponses</SubmitButton></div>
      <FormMessage state={state} />
    </form>
  );
}
