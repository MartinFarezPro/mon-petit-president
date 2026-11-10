"use client";

import { useActionState, useMemo, useState } from "react";
import { saveFinalPick } from "@/app/actions/picks";
import { FormMessage } from "@/components/FormMessage";
import { Portrait } from "@/components/Portrait";
import { SubmitButton } from "@/components/SubmitButton";
import { PARTICIPATION_2022 } from "@/lib/constants";
import { fmtNum } from "@/lib/format";
import {
  answerDuel, baseOrder, capFor, currentDuel, duelsDone, leaderShare, normalizeRanking, orderErrors,
  orderFromScores, parsePct, rankedValues, startDuels, surpriseFrom, type DuelState,
} from "@/lib/ranking";
import type { Candidate, FinalPick } from "@/lib/types";

const show = (x: number) => String(x).replace(".", ",");

export function PickForm({ leagueId, candidates, poll, pick, locked }: {
  leagueId: string; candidates: Candidate[]; poll: Record<string, number>; pick: FinalPick | null; locked: boolean;
}) {
  const [state, action] = useActionState(saveFinalPick, null);
  const byId = useMemo(() => Object.fromEntries(candidates.map((c) => [c.id, c])), [candidates]);
  const ids = useMemo(() => candidates.map((c) => c.id), [candidates]);
  const base = useMemo(() => baseOrder(ids, poll), [ids, poll]);

  const saved = pick?.classement?.length
    ? normalizeRanking(pick.classement, ids)
    : pick && Object.keys(pick.scores ?? {}).length ? orderFromScores(base, pick.scores) : null;

  const [ranking, setRanking] = useState<string[]>(saved ?? base);
  const [duel, setDuel] = useState<DuelState | null>(saved || locked ? null : startDuels(base));
  const [history, setHistory] = useState<DuelState[]>([]);
  const [canKeep, setCanKeep] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const r = saved ?? base;
    return Object.fromEntries(
      r.slice(1).filter((id) => pick?.scores?.[id] != null).map((id) => [id, show(pick!.scores[id])]),
    );
  });
  const [captain, setCaptain] = useState(pick?.capitaine ?? "");
  const [gagnant, setGagnant] = useState(pick?.gagnant ?? "");
  const [scoreGagnant, setScoreGagnant] = useState(pick?.score_gagnant != null ? show(pick.score_gagnant) : "");
  const [participation, setParticipation] = useState(pick?.participation != null ? show(pick.participation) : "");

  const dis = locked;
  const values = rankedValues(ranking, vals);
  const errors = orderErrors(values);
  const leader = ranking[0];
  const finalists = ranking.slice(0, 2);
  const g = finalists.includes(gagnant) ? gagnant : "";
  const surprise = surpriseFrom(ranking);
  const given = values.slice(1).reduce((a, v) => a + v, 0);

  /** Change l'ordre en gardant le % de chacun ; le nouveau 1er prend la part restante. */
  function reorder(next: string[]) {
    setVals((v) => {
      if (next[0] === ranking[0]) return v;
      // L'ancien n°1 garde sa part seulement si des % ont déjà été donnés (sinon il aurait 100 %).
      const out = Object.keys(v).length ? { ...v, [ranking[0]]: show(leaderShare(ranking, v)) } : { ...v };
      delete out[next[0]];
      return out;
    });
    setRanking(next);
  }
  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= ranking.length) return;
    const next = [...ranking];
    [next[i], next[j]] = [next[j], next[i]];
    reorder(next);
  }
  function setPct(id: string, raw: string) {
    const clean = raw.replace(/[^0-9.,]/g, "");
    setVals((v) => {
      const cap = capFor(ranking, v, id);
      return { ...v, [id]: parsePct(clean) > cap ? show(cap) : clean };
    });
  }
  function choose(challengerWins: boolean) {
    if (!duel) return;
    const s = answerDuel(duel, challengerWins);
    setHistory((h) => [...h, duel]);
    if (duelsDone(s)) {
      reorder(s.sorted);
      setDuel(null);
      setHistory([]);
    } else setDuel(s);
  }
  function undo() {
    if (!history.length) return;
    setDuel(history[history.length - 1]);
    setHistory(history.slice(0, -1));
  }
  function redoDuels() {
    setDuel(startDuels(ranking));
    setHistory([]);
    setCanKeep(true);
  }

  const current = duel ? currentDuel(duel) : null;

  return (
    <form action={action} className="stack">
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="capitaine" value={captain} />
      <input type="hidden" name="classement" value={duel ? "" : ranking.join(",")} />
      <input type="hidden" name="gagnant" value={g} />
      {!duel && <input type="hidden" name={`score_${leader}`} value={show(values[0])} />}

      {duel && current ? (
        <section className="card stack">
          <div className="section-h"><h2>Le 1er tour : tes duels</h2><span className="pts">60 pts + 10 par candidat</span></div>
          <p className="hint">
            Clique sur celui qui fera <b>le plus de voix au 1er tour</b>. On part des sondages : tu ne fais remonter que ceux que tu vois mieux placés.
          </p>
          <Duel
            question="Qui fera le plus de voix au 1er tour ?"
            a={byId[current[0]]} b={byId[current[1]]} poll={poll}
            onPick={(id) => choose(id === current[1])}
          />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="hint">
              Candidat {duel.sorted.length + 1} sur {ranking.length} · {duel.played} duel{duel.played > 1 ? "s" : ""}
            </span>
            <div className="row">
              {history.length > 0 && <button type="button" className="btn ghost small" onClick={undo}>← Annuler le dernier duel</button>}
              {canKeep && (
                <button type="button" className="btn ghost small" onClick={() => { setDuel(null); setHistory([]); }}>
                  Garder mon classement
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="card stack">
            <div className="section-h"><h2>Ton classement du 1er tour</h2><span className="pts">60 pts + 10 par candidat</span></div>
            <p className="hint">
              Ton n°1 part à 100 % et perd ce que tu donnes aux autres : le total fait toujours 100 %. Les flèches changent l&apos;ordre,
              le bouton <b>C</b> désigne ton capitaine (ses points comptent double).
            </p>
            <ol className="ranks">
              {ranking.map((id, i) => {
                const c = byId[id];
                const bad = errors.includes(i);
                return (
                  <li key={id} className={bad ? "rankrow bad" : "rankrow"}>
                    <span className="rk">{i + 1}</span>
                    <Portrait c={c} size={40} />
                    <div className="nm">
                      <b>{c.nom}</b>
                      <small>{c.parti}{poll[id] != null ? ` · sondages ${fmtNum(poll[id])} %` : ""}</small>
                      {bad && <small className="rank-err">Plus que le n°{i}, classé devant</small>}
                    </div>
                    {i === 0 ? (
                      <output className="numfield lead" aria-label={`Score de ${c.nom}`}>{show(values[0])}</output>
                    ) : (
                      <input type="text" inputMode="decimal" className="numfield" name={`score_${id}`}
                        aria-label={`Score de ${c.nom} en %`} placeholder={poll[id] != null ? fmtNum(poll[id]) : "%"}
                        value={vals[id] ?? ""} onChange={(e) => setPct(id, e.target.value)} disabled={dis} />
                    )}
                    <button type="button" className="cap" aria-pressed={captain === id} title={`${c.nom} capitaine`}
                      aria-label={`Désigner ${c.nom} capitaine`} disabled={dis}
                      onClick={() => setCaptain((x) => (x === id ? "" : id))}>C</button>
                    {!dis && (
                      <span className="mv">
                        <button type="button" aria-label={`Monter ${c.nom}`} disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                        <button type="button" aria-label={`Descendre ${c.nom}`} disabled={i === ranking.length - 1} onClick={() => move(i, 1)}>▼</button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className={errors.length ? "sumbar over" : "sumbar"}>
              <span>
                {errors.length ? `${errors.length} erreur${errors.length > 1 ? "s" : ""} d'ordre` : "Attribué aux autres"}
                {captain ? ` · capitaine : ${byId[captain]?.nom}` : ""}
              </span>
              <span>{fmtNum(given)} % · total 100 %</span>
            </div>
            {!dis && (
              <div className="row">
                <button type="button" className="btn ghost small" onClick={redoDuels}>
                  Refaire les duels
                </button>
              </div>
            )}
          </section>

          <section className="card stack">
            <div className="section-h"><h2>Le 2nd tour</h2><span className="pts">jusqu&apos;à 60 pts</span></div>
            <p className="hint">Tes deux qualifiés sont tes n°1 et n°2. Qui l&apos;emporte le 2 mai ?</p>
            {finalists.length === 2 && (
              <Duel question="Qui sera élu·e le 2 mai ?" a={byId[finalists[0]]} b={byId[finalists[1]]} poll={{}}
                selected={g} disabled={dis} onPick={setGagnant} />
            )}
            <div className="grid2">
              <div>
                <label htmlFor="score_gagnant">Score du vainqueur au 2nd tour (%)</label>
                <input id="score_gagnant" name="score_gagnant" type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield"
                  placeholder="52,5" value={scoreGagnant} onChange={(e) => setScoreGagnant(e.target.value)} disabled={dis} />
              </div>
              <div>
                <label htmlFor="participation">Participation au 1er tour (%)</label>
                <input id="participation" name="participation" type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]+)?" className="numfield"
                  placeholder="74,0" value={participation} onChange={(e) => setParticipation(e.target.value)} disabled={dis} />
                <p className="hint" style={{ marginTop: 4 }}>2022 : {fmtNum(PARTICIPATION_2022)} %.</p>
              </div>
            </div>
            {surprise && (
              <p className="hint">
                Ta surprise : <b>{byId[surprise]?.nom}</b>, ton mieux classé hors des 4 favoris des sondages (15 pts s&apos;il l&apos;est vraiment).
              </p>
            )}
          </section>

          {!locked && (
            <div className="stack" style={{ gap: 10 }}>
              <div className="row"><SubmitButton disabled={errors.length > 0}>Valider mon prono</SubmitButton></div>
              <FormMessage state={state} />
            </div>
          )}
        </>
      )}
    </form>
  );
}

function Duel({ question, a, b, poll, onPick, selected, disabled }: {
  question: string; a: Candidate; b: Candidate; poll: Record<string, number>;
  onPick: (id: string) => void; selected?: string; disabled?: boolean;
}) {
  const side = (c: Candidate) => (
    <button type="button" className="duelist" aria-pressed={selected === c.id} disabled={disabled} onClick={() => onPick(c.id)}
      style={{ ["--c" as string]: c.couleur }}>
      <Portrait c={c} size={112} />
      <b>{c.nom}</b>
      <small>{c.parti}{poll[c.id] != null ? ` · ${fmtNum(poll[c.id])} %` : ""}</small>
      <span className="pickme">{selected === c.id ? "✓ Mon choix" : "Devant"}</span>
    </button>
  );
  return (
    <div className="duel" role="group" aria-label={question}>
      <p className="duel-q">{question}</p>
      <div className="duel-row">
        {side(a)}
        <span className="vs">VS</span>
        {side(b)}
      </div>
    </div>
  );
}
