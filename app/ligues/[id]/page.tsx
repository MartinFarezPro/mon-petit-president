import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Reactions } from "@/components/Reactions";
import { computeBadges } from "@/lib/badges";
import { isLocked } from "@/lib/constants";
import { loadLeague } from "@/lib/data";
import { fmtPts } from "@/lib/format";
import { PARIS_BY_ID, PARIS_TOTAL } from "@/lib/paris";
import { QUIZ_PREVUS, QUIZ_TAILLE } from "@/lib/quiz";
import { BAREME, computeStandings, hasResults, maxSoFar, ranks } from "@/lib/scoring";

export default async function Classement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const locked = isLocked();
  const now = new Date();
  const input = {
    memberIds: ctx.members.map((m) => m.id), picks: ctx.picks, results: ctx.results, locked, faits: ctx.faits,
    parisReponses: ctx.parisReponses, quizzes: ctx.quizzes, quizQuestions: ctx.quizQuestions, quizReponses: ctx.quizReponses,
    corrections: ctx.corrections, now,
  };
  const standings = computeStandings(input);
  const max = maxSoFar(input);
  const badges = computeBadges({ standings, quizzes: ctx.quizzes, quizQuestions: ctx.quizQuestions, quizReponses: ctx.quizReponses, picks: ctx.picks, locked, now });
  const rk = ranks(standings.map((s) => s.total));
  const deposited = new Set(ctx.pickStatus.map((p) => p.user_id));
  const path = `/ligues/${id}`;
  const finalLive = locked && hasResults(ctx.results);

  const anyPoints = standings.some((s) => s.total > 0);
  const me = standings.find((s) => s.userId === ctx.userId);
  const SAISON = BAREME.prono + PARIS_TOTAL + QUIZ_PREVUS * QUIZ_TAILLE;
  const pct = (x: number) => `${Math.min(100, (x / SAISON) * 100)}%`;

  return (
    <div className="stack">
      {ctx.members.length < 2 && ctx.isAdmin && (
        <p className="notice info">
          Tu es seul·e pour l&apos;instant : partage le code <b className="mono">{ctx.league.code_invitation}</b> depuis l&apos;onglet{" "}
          <Link href={`${path}/admin`}>Admin</Link>.
        </p>
      )}
      {!deposited.has(ctx.userId) && !locked && (
        <p className="notice warn">Tu n&apos;as pas encore déposé ton prono final. <Link href={`${path}/prono`}>Je m&apos;y colle →</Link></p>
      )}

      <section className="card stack saison">
        <div className="section-h">
          <h2>La saison</h2>
          <span className="pts">~{SAISON} pts en jeu</span>
        </div>
        <div className="saison-bar" aria-hidden="true">
          <span className="seg prono" style={{ width: pct(BAREME.prono) }} />
          <span className="seg paris" style={{ width: pct(PARIS_TOTAL) }} />
          <span className="seg quiz" style={{ width: pct(QUIZ_PREVUS * QUIZ_TAILLE) }} />
        </div>
        <div className="saison-legend">
          <Link href={`${path}/prono`}><i className="prono" />Prono final <b>{BAREME.prono}</b></Link>
          <Link href={`${path}/paris`}><i className="paris" />Paris <b>{PARIS_TOTAL}</b></Link>
          <Link href={`${path}/quiz`}><i className="quiz" />Quiz <b>~{QUIZ_PREVUS * QUIZ_TAILLE}</b></Link>
        </div>
        <p className="hint">
          Déjà tranché : <b>{fmtPts(max.total)} pts</b> ({fmtPts(max.paris)} de paris, {fmtPts(max.quiz)} de quiz
          {max.prono ? `, ${max.prono} de prono` : ""}).
          {me && max.total > 0 && <> Tu en as pris <b>{fmtPts(me.total)}</b>, soit {Math.round((me.total / max.total) * 100)} % du score parfait.</>}
        </p>
      </section>

      <section className="card stack">
        <div className="section-h">
          <h2>Classement général</h2>
          <span className="hint">{anyPoints ? "prono + paris + quiz" : "les points tombent à la clôture des quiz et des paris"}</span>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr><th></th><th>Équipe</th><th className="hide-sm">Répartition</th><th className="num">Pts</th></tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const p = ctx.profilesById[s.userId];
                const isMe = s.userId === ctx.userId;
                const tot = Math.max(1, s.total);
                return (
                  <tr key={s.userId} className={[rk[i] === 1 && anyPoints ? "first" : "", isMe ? "me" : ""].join(" ")}>
                    <td className="rank">{anyPoints ? rk[i] : "·"}</td>
                    <td>
                      <div className="team">
                        <Avatar p={p} />
                        <div style={{ minWidth: 0 }}>
                          <b>{p?.equipe || p?.pseudo}</b>
                          <small>
                            {[p?.equipe ? p.pseudo : "", isMe ? "toi" : "", locked ? "" : deposited.has(s.userId) ? "prono déposé" : "prono à faire"]
                              .filter(Boolean).join(" · ")}
                          </small>
                          {(badges[s.userId] ?? []).length > 0 && (
                            <div className="chips" style={{ marginTop: 4 }}>
                              {badges[s.userId].map((b) => (
                                <span key={b.id} className="chip" title={b.title}>{b.emoji} {b.label}</span>
                              ))}
                            </div>
                          )}
                          <div style={{ marginTop: 4 }}>
                            <Reactions leagueId={id} contexte="general" cibleUser={s.userId} reactions={ctx.reactions} me={ctx.userId} path={path} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-sm" style={{ width: 150 }}>
                      {s.total > 0 ? (
                        <div className="split" title={`Prono ${fmtPts(s.final.total)} · Paris ${fmtPts(s.paris)} · Quiz ${fmtPts(s.quiz)}`}>
                          <span className="seg prono" style={{ width: `${(s.final.total / tot) * 100}%` }} />
                          <span className="seg paris" style={{ width: `${(s.paris / tot) * 100}%` }} />
                          <span className="seg quiz" style={{ width: `${(s.quiz / tot) * 100}%` }} />
                        </div>
                      ) : <span className="hint">–</span>}
                    </td>
                    <td className="num" style={{ fontSize: 17, fontWeight: 700 }}>{fmtPts(s.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Détail des points</h2><span className="hint">touche une équipe pour le détail</span></div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Équipe</th>
                <th className="num">Prono</th>
                <th className="num">Paris</th>
                <th className="num">Quiz</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => {
                const p = ctx.profilesById[s.userId];
                const parisWon = Object.entries(s.parisDetail).filter(([, v]) => v > 0);
                return (
                  <tr key={s.userId} className={s.userId === ctx.userId ? "me" : ""}>
                    <td>
                      <details>
                        <summary>{p?.equipe || p?.pseudo}</summary>
                        <div className="chips" style={{ marginTop: 6 }}>
                          {s.final.parts.map((x) => <span key={x.label} className="chip">{x.label} {fmtPts(x.points)}</span>)}
                          {parisWon.map(([k, v]) => <span key={k} className="chip ok">{PARIS_BY_ID[k]?.emoji} {fmtPts(v)}</span>)}
                          {!s.final.parts.length && !parisWon.length && (
                            <span className="hint">{finalLive ? "Aucun point au prono final ni aux paris" : "Prono final : en attente des résultats officiels"}</span>
                          )}
                        </div>
                      </details>
                    </td>
                    <td className="num">{finalLive ? fmtPts(s.final.total) : "–"}</td>
                    <td className="num">{fmtPts(s.paris)}</td>
                    <td className="num">{fmtPts(s.quiz)}</td>
                    <td className="num"><b>{fmtPts(s.total)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
