import { loadLeague } from "@/lib/data";
import { fmtDate, fmtDelta, fmtNum, shortName } from "@/lib/format";

export default async function Sondages({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const [latest, previous] = ctx.polls;
  if (!latest) return <div className="card empty"><b>Pas encore de sondage</b>Le relevé arrive chaque lundi.</div>;

  const rows = ctx.candidates
    .map((c) => ({ c, v: latest.valeurs[c.id] ?? null, prev: previous?.valeurs[c.id] ?? null }))
    .sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const max = Math.max(40, ...rows.map((r) => r.v ?? 0));
  const history = ctx.polls.slice(0, 8);

  return (
    <div className="stack">
      <section className="card stack">
        <div className="section-h">
          <h2>Les sondages de la semaine</h2>
          <span className="hint">
            Moyenne {latest.source} au {fmtDate(latest.date)}{previous ? ` · évolution vs ${fmtDate(previous.date, { day: "numeric", month: "short" })}` : ""}
          </span>
        </div>
        <div className="bars">
          {rows.map(({ c, v, prev }) => {
            const d = v != null && prev != null ? v - prev : null;
            return (
              <div className="bar pl" key={c.id}>
                <span title={`${c.nom} (${c.parti})`}>{shortName(c.nom)}</span>
                <div className="track"><div className="fill" style={{ width: `${((v ?? 0) / max) * 100}%`, background: c.couleur }} /></div>
                <span className="v">{v != null ? fmtNum(v) : "n.c."}</span>
                <span className={`delta ${d != null && d > 0.05 ? "up" : d != null && d < -0.05 ? "down" : ""}`}>{fmtDelta(d)}</span>
              </div>
            );
          })}
        </div>
        {latest.url && <p className="hint">Source : <a href={latest.url} target="_blank" rel="noreferrer">{latest.source}</a></p>}
      </section>

      {history.length > 1 && (
        <section className="card stack">
          <div className="section-h"><h2>Historique</h2><span className="hint">{history.length} derniers relevés</span></div>
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Candidat</th>{history.map((p) => <th key={p.id} className="num">{fmtDate(p.date, { day: "numeric", month: "short" })}</th>)}</tr>
              </thead>
              <tbody>
                {rows.filter((r) => r.v != null).map(({ c }) => (
                  <tr key={c.id}>
                    <td><span className="dot" style={{ background: c.couleur, marginRight: 8 }} />{shortName(c.nom)}</td>
                    {history.map((p) => <td key={p.id} className="num">{fmtNum(p.valeurs[c.id])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
