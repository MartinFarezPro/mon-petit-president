import { Avatar } from "@/components/Avatar";
import { Reactions } from "@/components/Reactions";
import { loadLeague } from "@/lib/data";
import { fmtDateTime, fmtNum, fmtPts } from "@/lib/format";
import { isQuestionScored, questionCloture, ranks, round1, scoreAnswer } from "@/lib/scoring";
import type { Matchday, Question } from "@/lib/types";
import { AnswerForm } from "./AnswerForm";

export default async function Journees({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const now = new Date();
  const path = `/ligues/${id}/journees`;
  const sorted = [...ctx.matchdays].sort((a, b) => +new Date(b.cloture) - +new Date(a.cloture));
  const status = (m: Matchday) =>
    now < new Date(m.ouverture) ? "avenir" : ctx.questions.filter((q) => q.matchday_id === m.id).every((q) => questionCloture(q, m) <= now) && now >= new Date(m.cloture) ? "close" : "ouverte";
  const open = sorted.filter((m) => status(m) === "ouverte").reverse();
  const upcoming = sorted.filter((m) => status(m) === "avenir").reverse();
  const closed = sorted.filter((m) => status(m) === "close");
  const n = ctx.members.length;

  if (!ctx.matchdays.length) {
    return (
      <div className="card empty">
        <b>Pas encore de journée</b>
        {ctx.isAdmin ? "Crée la première depuis l'onglet Admin : 3 à 5 questions sur l'actu de la semaine." : "L'admin de la ligue n'a pas encore lancé de journée."}
      </div>
    );
  }

  return (
    <div className="stack">
      {open.map((m) => {
        const qs = ctx.questions.filter((q) => q.matchday_id === m.id);
        const answered = (q: Question) => new Set(ctx.answerStatus.filter((a) => a.question_id === q.id).map((a) => a.user_id)).size;
        return (
          <section key={m.id} className="card stack" id={`j-${m.id}`}>
            <div className="section-h">
              <h2>{m.titre}</h2>
              <span className="chip ok">Ouverte · clôture {fmtDateTime(m.cloture)}</span>
            </div>
            <AnswerForm
              leagueId={id}
              matchdayId={m.id}
              questions={qs.map((q) => ({
                ...q,
                closed: questionCloture(q, m) <= now,
                clotureLabel: q.cloture ? fmtDateTime(q.cloture) : null,
                answeredBy: answered(q),
                mine: ctx.answers.find((a) => a.question_id === q.id && a.user_id === ctx.userId)?.reponse ?? null,
              }))}
              memberCount={n}
            />
          </section>
        );
      })}

      {upcoming.map((m) => (
        <section key={m.id} className="card tight spread">
          <b>{m.titre}</b>
          <span className="chip">Ouvre {fmtDateTime(m.ouverture)}</span>
        </section>
      ))}

      {closed.map((m) => <ClosedMatchday key={m.id} m={m} ctx={ctx} path={path} />)}
    </div>
  );
}

function ClosedMatchday({ m, ctx, path }: { m: Matchday; ctx: Awaited<ReturnType<typeof loadLeague>>; path: string }) {
  const qs = ctx.questions.filter((q) => q.matchday_id === m.id);
  const corrected = qs.some(isQuestionScored);
  const totals = ctx.members
    .map((p) => ({
      p,
      pts: round1(qs.reduce((s, q) => s + scoreAnswer(q, ctx.answers.find((a) => a.question_id === q.id && a.user_id === p.id)?.reponse), 0)),
    }))
    .sort((a, b) => b.pts - a.pts);
  const rk = ranks(totals.map((t) => t.pts));
  const nameOf = (uid: string) => ctx.profilesById[uid]?.pseudo ?? "?";

  return (
    <section className="card stack" id={`j-${m.id}`}>
      <div className="section-h">
        <h2>{m.titre}</h2>
        <span className="chip">Close le {fmtDateTime(m.cloture)}</span>
      </div>
      {!corrected && <p className="notice warn">En attente des bonnes réponses de l&apos;admin.</p>}
      {qs.map((q) => {
        const ans = ctx.answers.filter((a) => a.question_id === q.id);
        const mine = ans.find((a) => a.user_id === ctx.userId);
        const good = Array.isArray(q.bonne_reponse) ? q.bonne_reponse : q.bonne_reponse != null ? [String(q.bonne_reponse)] : [];
        const myPts = scoreAnswer(q, mine?.reponse);
        return (
          <div key={q.id} className="question">
            <div className="spread">
              <b>{q.intitule}</b>
              <span className="pts">{fmtPts(q.points)} pts</span>
            </div>
            <div className="row hint">
              <span>Ta réponse : <b style={{ color: "var(--ink)" }}>{mine ? (q.type === "nombre" ? `${fmtNum(Number(mine.reponse))}${q.options.unite ?? ""}` : String(mine.reponse)) : "—"}</b></span>
              {isQuestionScored(q) && (
                <>
                  <span>· Bonne réponse : <b style={{ color: "var(--ok)" }}>{q.type === "nombre" ? `${fmtNum(Number(q.bonne_reponse))}${q.options.unite ?? ""}` : good.join(" ou ")}</b></span>
                  <span className={myPts > 0 ? "chip ok" : "chip bad"}>+{fmtPts(myPts)}</span>
                </>
              )}
            </div>
            {q.type === "choix" ? (
              <div className="bars">
                {(q.options.choix ?? []).map((opt) => {
                  const who = ans.filter((a) => a.reponse === opt).map((a) => nameOf(a.user_id));
                  const pct = ans.length ? (who.length / ans.length) * 100 : 0;
                  return (
                    <div className="bar" key={opt} title={who.join(", ")}>
                      <span style={{ fontWeight: good.includes(opt) ? 700 : 400 }}>{good.includes(opt) ? "✓ " : ""}{opt}</span>
                      <div className="track"><div className="fill" style={{ width: `${pct}%`, background: good.includes(opt) ? "var(--ok)" : "var(--bleu)" }} /></div>
                      <span className="v">{who.length}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="chips">
                {ans.sort((a, b) => Number(a.reponse) - Number(b.reponse)).map((a) => (
                  <span key={a.user_id} className={scoreAnswer(q, a.reponse) > 0 ? "chip ok" : "chip"}>
                    {nameOf(a.user_id)} : {fmtNum(Number(a.reponse))}{q.options.unite ?? ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {corrected && (
        <details>
          <summary>Classement de la journée</summary>
          <div className="tbl" style={{ marginTop: 8 }}>
            <table>
              <tbody>
                {totals.map((t, i) => (
                  <tr key={t.p.id} className={t.p.id === ctx.userId ? "me" : ""}>
                    <td className="rank">{rk[i]}</td>
                    <td>
                      <div className="team"><Avatar p={t.p} size={26} /><b>{t.p.equipe || t.p.pseudo}</b></div>
                      <div style={{ marginTop: 4 }}>
                        <Reactions leagueId={ctx.league.id} contexte={m.id} cibleUser={t.p.id} reactions={ctx.reactions} me={ctx.userId} path={path} />
                      </div>
                    </td>
                    <td className="num">{fmtPts(t.pts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
