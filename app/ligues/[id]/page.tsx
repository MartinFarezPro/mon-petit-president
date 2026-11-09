import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Reactions } from "@/components/Reactions";
import { computeBadges } from "@/lib/badges";
import { isLocked } from "@/lib/constants";
import { loadLeague } from "@/lib/data";
import { fmtPts } from "@/lib/format";
import { computeStandings, hasResults, isQuestionScored, questionCloture, ranks } from "@/lib/scoring";

export default async function Classement({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ journee?: string }>;
}) {
  const { id } = await params;
  const { journee } = await searchParams;
  const ctx = await loadLeague(id);
  const locked = isLocked();
  const now = new Date();
  const standings = computeStandings({
    memberIds: ctx.members.map((m) => m.id), picks: ctx.picks, results: ctx.results, locked,
    matchdays: ctx.matchdays, questions: ctx.questions, answers: ctx.answers, now,
  });
  const badges = computeBadges({ standings, matchdays: ctx.matchdays, questions: ctx.questions, picks: ctx.picks, locked, now });
  const rk = ranks(standings.map((s) => s.total));
  const deposited = new Set(ctx.pickStatus.map((p) => p.user_id));
  const path = `/ligues/${id}`;
  const finalLive = locked && hasResults(ctx.results);

  // Journées closes et corrigées (au moins une question)
  const scoredMds = ctx.matchdays.filter((m) => {
    const qs = ctx.questions.filter((q) => q.matchday_id === m.id);
    return qs.length && qs.some(isQuestionScored) && qs.every((q) => questionCloture(q, m) <= now);
  });
  const selected = scoredMds.find((m) => m.id === journee) ?? scoredMds[scoredMds.length - 1];
  const mdRows = selected
    ? [...standings].map((s) => ({ s, p: s.byMatchday[selected.id] ?? 0 })).sort((a, b) => b.p - a.p)
    : [];
  const mdRanks = ranks(mdRows.map((r) => r.p));

  const anyPoints = standings.some((s) => s.total > 0);

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

      <section className="card stack">
        <div className="section-h">
          <h2>Classement général</h2>
          <span className="hint">
            {finalLive ? "prono final + journées" : anyPoints ? "points des journées" : "les points tombent à la clôture de chaque journée"}
          </span>
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr><th></th><th>Équipe</th><th className="hide-sm">Statut</th><th className="num">Pts</th></tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const p = ctx.profilesById[s.userId];
                const isMe = s.userId === ctx.userId;
                return (
                  <tr key={s.userId} className={[rk[i] === 1 && anyPoints ? "first" : "", isMe ? "me" : ""].join(" ")}>
                    <td className="rank">{anyPoints ? rk[i] : "·"}</td>
                    <td>
                      <div className="team">
                        <Avatar p={p} />
                        <div style={{ minWidth: 0 }}>
                          <b>{p?.equipe || p?.pseudo}</b>
                          <small>{[p?.equipe ? p.pseudo : "", isMe ? "toi" : ""].filter(Boolean).join(" · ")}</small>
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
                    <td className="hide-sm">
                      {locked
                        ? <span className="chip">{s.finalCounted ? `Prono ${fmtPts(s.final.total)}` : deposited.has(s.userId) ? "Prono figé" : "Sans prono"}</span>
                        : deposited.has(s.userId) ? <span className="chip ok">Prono déposé</span> : <span className="chip warn">Prono à faire</span>}
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
        <div className="section-h">
          <h2>Par journée</h2>
          {selected && <span className="hint">{selected.titre}</span>}
        </div>
        {scoredMds.length === 0 ? (
          <div className="empty"><b>Pas encore de journée corrigée</b>Les points apparaissent dès que l&apos;admin saisit les bonnes réponses d&apos;une journée close.</div>
        ) : (
          <>
            <div className="chips">
              {scoredMds.map((m) => (
                <Link key={m.id} href={`${path}?journee=${m.id}`} className={m.id === selected?.id ? "chip me" : "chip"} scroll={false}>
                  {m.titre}
                </Link>
              ))}
            </div>
            <div className="tbl">
              <table>
                <tbody>
                  {mdRows.map((r, i) => {
                    const p = ctx.profilesById[r.s.userId];
                    return (
                      <tr key={r.s.userId} className={r.s.userId === ctx.userId ? "me" : ""}>
                        <td className="rank">{mdRanks[i]}</td>
                        <td><div className="team"><Avatar p={p} size={26} /><b>{p?.equipe || p?.pseudo}</b></div></td>
                        <td className="num">{fmtPts(r.p)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Détail des points</h2><span className="hint">par joueur</span></div>
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Équipe</th>
                {ctx.matchdays.map((m) => <th key={m.id} className="num" title={m.titre}>{m.titre.length > 10 ? m.titre.slice(0, 9) + "…" : m.titre}</th>)}
                <th className="num">Prono</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => {
                const p = ctx.profilesById[s.userId];
                return (
                  <tr key={s.userId} className={s.userId === ctx.userId ? "me" : ""}>
                    <td>
                      <details>
                        <summary>{p?.equipe || p?.pseudo}</summary>
                        <div className="chips" style={{ marginTop: 6 }}>
                          {s.final.parts.length
                            ? s.final.parts.map((x) => <span key={x.label} className="chip">{x.label} {fmtPts(x.points)}</span>)
                            : <span className="hint">{finalLive ? "Aucun point au prono final" : "Prono final : en attente des résultats officiels"}</span>}
                        </div>
                      </details>
                    </td>
                    {ctx.matchdays.map((m) => <td key={m.id} className="num">{fmtPts(s.byMatchday[m.id] ?? 0)}</td>)}
                    <td className="num">{finalLive ? fmtPts(s.final.total) : "–"}</td>
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
