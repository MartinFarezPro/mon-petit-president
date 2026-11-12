"use client";

import { useEffect, useState, useTransition } from "react";
import { answerQuiz, quizDone } from "@/app/actions/quiz";
import { Icon } from "@/components/Icon";
import { Portrait } from "@/components/Portrait";
import { fmtDate, shortName } from "@/lib/format";
import type { Candidate, QuizQuestion } from "@/lib/types";

type Cand = Pick<Candidate, "id" | "nom" | "couleur" | "photo" | "parti">;
type Done = Record<string, { choix: string; bonne: string }>;

const BRAVO = ["Bien vu !", "Exact !", "Imparable.", "Tu lis dans les pensées.", "Nostradamus !"];
const RATE = ["Raté !", "Eh non…", "Piégé·e !", "Pas cette fois.", "Bien tenté."];

export function QuizPlayer({ titre, cloture, questions, candidates, initial, shareUrl, onAnswer = answerQuiz, onDone = quizDone }: {
  titre: string; cloture: string; questions: QuizQuestion[]; candidates: Cand[]; initial: Done; shareUrl: string;
  onAnswer?: typeof answerQuiz; onDone?: () => void;
}) {
  const qs = [...questions].sort((a, b) => a.ordre - b.ordre);
  const [done, setDone] = useState<Done>(initial);
  const firstTodo = qs.findIndex((q) => !initial[q.id]);
  const [idx, setIdx] = useState(firstTodo === -1 ? qs.length : firstTodo);
  const [started, setStarted] = useState(Object.keys(initial).length > 0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));

  const bons = qs.filter((q) => done[q.id] && done[q.id].choix === done[q.id].bonne).length;
  const grid = qs.map((q) => (!done[q.id] ? "⬜" : done[q.id].choix === done[q.id].bonne ? "🟩" : "🟥")).join("");
  const playing = started && idx < qs.length;
  // Sur mobile, le quiz passe en plein écran : une citation par page, sans défilement derrière.
  useEffect(() => {
    if (!playing) return;
    document.body.classList.add("quiz-on");
    return () => document.body.classList.remove("quiz-on");
  }, [playing]);

  if (!started) {
    return (
      <div className="quiz-start">
        <div className="quiz-big"><Icon name="bulle" size={56} /></div>
        <h2>Qui a dit ?</h2>
        <p className="hint">{qs.length} citations de la semaine · 1 pt par bonne réponse · ta 1re réponse est définitive.</p>
        <button className="btn" onClick={() => setStarted(true)}>{Object.keys(done).length ? "Reprendre" : "C'est parti"}</button>
      </div>
    );
  }

  if (idx >= qs.length) {
    const text = `Mon Petit Président · Qui a dit ? · ${titre}\n${grid}\n${bons}/${qs.length}\n${shareUrl}`;
    return (
      <div className="quiz-end">
        <div className="quiz-score"><b>{bons}</b><span>/{qs.length}</span></div>
        <p className="quiz-grid" aria-label={`${bons} bonnes réponses sur ${qs.length}`}>{grid}</p>
        <p className="hint">
          {bons === qs.length ? "Sans-faute. Respect." : bons >= qs.length * 0.7 ? "Très solide." : bons >= qs.length * 0.4 ? "Pas mal du tout." : "La politique, c'est dur."}
          {" "}Le classement de la ligue tombe à la clôture, le {fmtDate(cloture, { weekday: "long", day: "numeric", month: "long" })}.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={async () => {
            try {
              if (navigator.share && /Mobi/i.test(navigator.userAgent)) await navigator.share({ text });
              else await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {}
          }}>{copied ? "Copié ✓" : "Partager mon score"}</button>
        </div>
        <Recap qs={qs} done={done} byId={byId} />
      </div>
    );
  }

  const q = qs[idx];
  const answer = done[q.id];
  const good = answer && answer.choix === answer.bonne;

  function pick(choix: string) {
    if (answer || pending) return;
    setErr(null);
    start(async () => {
      const r = await onAnswer(q.id, choix);
      if (!r.ok) return setErr(r.error);
      const next = { ...done, [q.id]: { choix: r.monChoix, bonne: r.bonne } };
      setDone(next);
      if (qs.every((x) => next[x.id])) onDone();
    });
  }

  return (
    <div className="quiz-play">
      <div className="quiz-top">
        <span className="quiz-count"><b>{idx + 1}</b>/{qs.length}</span>
        <span className="quiz-top-t">Qui a dit ?</span>
        <button type="button" className="quiz-close" onClick={() => setStarted(false)} aria-label="Mettre le quiz en pause">✕</button>
      </div>
      <div className="quiz-dots" aria-label={`Citation ${idx + 1} sur ${qs.length}`}>
        {qs.map((x, i) => (
          <span key={x.id} className={!done[x.id] ? (i === idx ? "cur" : "") : done[x.id].choix === done[x.id].bonne ? "ok" : "ko"} />
        ))}
      </div>
      <figure className={`quote big ${answer ? (good ? "good" : "bad") : ""}`} key={q.id}>
        <blockquote>{q.citation}</blockquote>
        {(q.contexte || q.date_citation) && (
          <figcaption>{[q.contexte, q.date_citation ? fmtDate(q.date_citation, { day: "numeric", month: "long" }) : ""].filter(Boolean).join(" · ")}</figcaption>
        )}
      </figure>
      <div className={`quiz-choices n${q.choix.length}`}>
        {q.choix.map((id) => {
          const c = byId[id];
          const cls = !answer ? "" : id === answer.bonne ? "right" : id === answer.choix ? "wrong" : "dim";
          return (
            <button key={id} className={`qchoice ${cls}`} onClick={() => pick(id)} disabled={!!answer || pending}
              style={{ "--c": c?.couleur ?? "#888" } as React.CSSProperties}>
              {c && <Portrait c={c} size={56} />}
              <b>{c ? shortName(c.nom) : id}</b>
              {c && <small>{c.parti}</small>}
            </button>
          );
        })}
      </div>
      {err && <p className="notice err">{err}</p>}
      {answer && (
        <div className={`quiz-verdict ${good ? "good" : "bad"}`} role="status">
          <b>{good ? BRAVO[idx % BRAVO.length] : RATE[idx % RATE.length]}</b>
          <span>C&apos;est {byId[answer.bonne]?.nom ?? answer.bonne} qui l&apos;a dit.</span>
          <button className="btn" autoFocus onClick={() => setIdx(idx + 1)}>
            {idx + 1 < qs.length ? "Citation suivante →" : "Voir mon score"}
          </button>
        </div>
      )}
    </div>
  );
}

function Recap({ qs, done, byId }: { qs: QuizQuestion[]; done: Done; byId: Record<string, Cand> }) {
  return (
    <details className="quiz-recap">
      <summary>Revoir les citations</summary>
      <ol>
        {qs.map((q) => {
          const d = done[q.id];
          return (
            <li key={q.id}>
              <q>{q.citation}</q>
              <span className={d && d.choix === d.bonne ? "chip ok" : "chip bad"}>
                {d ? `${byId[d.bonne]?.nom ?? d.bonne}${d.choix !== d.bonne ? ` (toi : ${shortName(byId[d.choix]?.nom ?? d.choix)})` : ""}` : "Pas répondu"}
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
