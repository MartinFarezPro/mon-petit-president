import { Avatar } from "@/components/Avatar";
import { Portrait } from "@/components/Portrait";
import type { LeagueContext } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { grille, scoreQuiz } from "@/lib/quiz";
import { ranks } from "@/lib/scoring";
import type { Quiz } from "@/lib/types";

export type QuizCtx = Pick<LeagueContext, "quizQuestions" | "corrections" | "quizReponses" | "members" | "faits" | "userId">;

export function ClosedQuiz({ quiz, ctx, open }: { quiz: Quiz; ctx: QuizCtx; open: boolean }) {
  const qs = ctx.quizQuestions.filter((q) => q.quiz_id === quiz.id).sort((a, b) => a.ordre - b.ordre);
  const rows = ctx.members
    .map((m) => ({ m, s: scoreQuiz(qs, ctx.corrections, ctx.quizReponses, m.id), g: grille(qs, ctx.corrections, ctx.quizReponses, m.id) }))
    .sort((a, b) => b.s.bons - a.s.bons);
  const rk = ranks(rows.map((r) => r.s.bons));
  const players = rows.filter((r) => r.s.joues > 0);
  const byId = Object.fromEntries(ctx.faits.candidates.map((c) => [c.id, c]));

  return (
    <details className="card quiz-archive" open={open}>
      <summary className="spread">
        <span><b>{quiz.titre}</b> <span className="hint">· clos le {fmtDate(quiz.cloture)}</span></span>
        <span className="chip">{players.length}/{ctx.members.length} joueurs</span>
      </summary>
      <div className="stack" style={{ marginTop: 14 }}>
        <div className="tbl">
          <table>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.m.id} className={r.m.id === ctx.userId ? "me" : ""}>
                  <td className="rank">{r.s.joues ? rk[i] : "·"}</td>
                  <td><div className="team"><Avatar p={r.m} size={26} /><b>{r.m.equipe || r.m.pseudo}</b></div></td>
                  <td className="quiz-grid small">{r.s.joues ? r.g : <span className="hint">pas joué</span>}</td>
                  <td className="num"><b>{r.s.bons}</b>/{qs.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Les citations</h3>
        <ol className="quiz-answers">
          {qs.map((q) => {
            const bonne = ctx.corrections[q.id];
            const c = byId[bonne];
            const found = players.filter((r) => ctx.quizReponses.some((x) => x.question_id === q.id && x.user_id === r.m.id && x.choix === bonne)).length;
            return (
              <li key={q.id}>
                <q>{q.citation}</q>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  {c && <Portrait c={c} size={26} />}
                  <b>{c?.nom ?? bonne}</b>
                  {q.contexte && <span className="hint">· {q.contexte}</span>}
                  {players.length > 0 && <span className="chip">{Math.round((found / players.length) * 100)} % de la ligue a trouvé</span>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}
