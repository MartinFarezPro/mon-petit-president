"use client";

import { useActionState, useState } from "react";
import { answerMatchday } from "@/app/actions/matchdays";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import type { Question } from "@/lib/types";

type Q = Question & { closed: boolean; clotureLabel: string | null; answeredBy: number; mine: string | number | null };

export function AnswerForm({ leagueId, matchdayId, questions, memberCount }: {
  leagueId: string; matchdayId: string; questions: Q[]; memberCount: number;
}) {
  const [state, action] = useActionState(answerMatchday, null);
  // Contrôlé pour ne pas perdre la saisie si l'envoi échoue
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.id, q.mine != null ? String(q.mine) : ""])),
  );
  const setVal = (id: string, v: string) => setVals((x) => ({ ...x, [id]: v }));
  const allAnswered = questions.every((q) => q.mine != null || q.closed);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="matchday_id" value={matchdayId} />
      {questions.map((q, i) => (
        <fieldset key={q.id} className="question" disabled={q.closed} style={{ margin: 0 }}>
          <legend className="spread" style={{ width: "100%", padding: 0, float: "left" }}>
            <b>{i + 1}. {q.intitule}</b>
            <span className="pts">{q.points} pts</span>
          </legend>
          <div className="hint" style={{ clear: "both" }}>
            {q.closed ? "Question close." : q.clotureLabel ? `Clôture de cette question : ${q.clotureLabel}. ` : ""}
            {q.type === "nombre" && q.options.tolerance ? `Points dégressifs : 0 à ±${q.options.tolerance}${q.options.unite ?? ""} d'écart. ` : ""}
            {q.answeredBy}/{memberCount} ont répondu.
          </div>
          {q.type === "choix" ? (
            <div className="options" role="radiogroup">
              {(q.options.choix ?? []).map((opt) => (
                <label key={opt} className="opt" style={{ margin: 0 }}>
                  <input type="radio" name={`q_${q.id}`} value={opt} checked={vals[q.id] === opt} onChange={() => setVal(q.id, opt)} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="row" style={{ maxWidth: 260 }}>
              <input type="text" inputMode="decimal" pattern="-?[0-9]+([.,][0-9]+)?" className="numfield" name={`q_${q.id}`} value={vals[q.id]} onChange={(e) => setVal(q.id, e.target.value)}
                aria-label={q.intitule} style={{ flex: 1 }} />
              {q.options.unite && <span className="hint">{q.options.unite}</span>}
            </div>
          )}
        </fieldset>
      ))}
      <div className="row">
        <SubmitButton>{allAnswered ? "Modifier mes réponses" : "Valider mes réponses"}</SubmitButton>
        <span className="hint">Les réponses des autres s&apos;affichent à la clôture.</span>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
