import { Avatar } from "@/components/Avatar";
import { Reactions } from "@/components/Reactions";
import { isLocked } from "@/lib/constants";
import { loadLeague } from "@/lib/data";
import { fmtDateTime, fmtNum, fmtPts, shortName } from "@/lib/format";
import { hasResults, scoreFinalPick } from "@/lib/scoring";
import { PickForm } from "./PickForm";

export default async function Prono({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const locked = isLocked();
  const mine = ctx.picks.find((p) => p.user_id === ctx.userId) ?? null;
  const latest = ctx.polls[0];
  const byId = Object.fromEntries(ctx.candidates.map((c) => [c.id, c]));
  const nm = (x: string | null) => (x && byId[x] ? shortName(byId[x].nom) : "–");
  const path = `/ligues/${id}/prono`;

  return (
    <div className="stack">
      {locked ? (
        <p className="notice info">Les pronos sont clos depuis le 17 avril à 23 h 59. {mine ? "Voici le tien, figé." : "Tu n'as pas déposé de prono."}</p>
      ) : (
        <p className={mine ? "notice ok" : "notice info"}>
          {mine
            ? `Ton prono est enregistré (dernière modif : ${fmtDateTime(mine.updated_at)}). Tu peux le changer jusqu'au 17 avril, 23 h 59.`
            : "Tu n'as pas encore de prono. Les autres ne le verront qu'à la clôture."}
        </p>
      )}

      <PickForm leagueId={id} candidates={ctx.candidates} poll={latest?.valeurs ?? {}} pick={mine} locked={locked} />
      <p className="hint" style={{ textAlign: "center" }}>Portraits : Wikimédia Commons, sous licences libres.</p>

      {locked && ctx.picks.length > 0 && (
        <>
          <Consensus ctx={ctx} />
          <section className="card stack">
            <div className="section-h"><h2>Tous les pronos</h2><span className="hint">{ctx.picks.length} déposés</span></div>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th>Équipe</th><th>Qualifiés</th><th>Vainqueur</th><th>Capitaine</th><th>Surprise</th><th className="num">Partic.</th>{hasResults(ctx.results) && <th className="num">Pts</th>}</tr>
                </thead>
                <tbody>
                  {ctx.picks.map((p) => {
                    const prof = ctx.profilesById[p.user_id];
                    return (
                      <tr key={p.user_id} className={p.user_id === ctx.userId ? "me" : ""}>
                        <td>
                          <div className="team"><Avatar p={prof} size={26} /><b>{prof?.equipe || prof?.pseudo}</b></div>
                          <div style={{ marginTop: 4 }}>
                            <Reactions leagueId={id} contexte="final" cibleUser={p.user_id} reactions={ctx.reactions} me={ctx.userId} path={path} />
                          </div>
                        </td>
                        <td>{nm(p.q1)} / {nm(p.q2)}</td>
                        <td>{nm(p.gagnant)}{p.score_gagnant != null ? ` (${fmtNum(p.score_gagnant)})` : ""}</td>
                        <td>{nm(p.capitaine)}</td>
                        <td>{nm(p.surprise)}</td>
                        <td className="num">{fmtNum(p.participation)}</td>
                        {hasResults(ctx.results) && <td className="num"><b>{fmtPts(scoreFinalPick(p, ctx.results).total)}</b></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Consensus({ ctx }: { ctx: Awaited<ReturnType<typeof loadLeague>> }) {
  const poll = ctx.polls[0]?.valeurs ?? {};
  const avg = ctx.candidates
    .map((c) => {
      const v = ctx.picks.map((p) => p.scores?.[c.id]).filter((x): x is number => x != null);
      return { c, a: v.length ? v.reduce((s, x) => s + Number(x), 0) / v.length : null };
    })
    .filter((x): x is { c: (typeof ctx.candidates)[number]; a: number } => x.a != null)
    .sort((a, b) => b.a - a.a);
  const max = Math.max(40, ...avg.map((x) => x.a));
  if (!avg.length) return null;
  return (
    <section className="card stack">
      <div className="section-h"><h2>Le consensus des potes</h2><span className="hint">moyenne des pronos · trait = sondages</span></div>
      <div className="bars">
        {avg.map(({ c, a }) => (
          <div className="bar" key={c.id}>
            <span>{shortName(c.nom)}</span>
            <div className="track">
              <div className="fill" style={{ width: `${(a / max) * 100}%`, background: c.couleur }} />
              {poll[c.id] != null && <div className="poll" style={{ left: `${(poll[c.id] / max) * 100}%` }} />}
            </div>
            <span className="v">{fmtNum(a)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
