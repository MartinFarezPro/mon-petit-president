import { loadLeague } from "@/lib/data";
import { countdown, fmtPts, shortName } from "@/lib/format";
import { PARIS, PARIS_TOTAL, PHASES, POINTS_PARI, scorePari, trancher, VERROU_CAMPAGNE, type Pari, type Phase } from "@/lib/paris";
import { PariCard } from "./PariCard";

export const metadata = { title: "Paris" };

export default async function Paris({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const now = new Date();
  const mine = (p: Pari) => ctx.parisReponses.find((r) => r.user_id === ctx.userId && r.pari_id === p.id);
  const allCands = ctx.faits.candidates;
  const label = (p: Pari, x: string) =>
    p.kind === "choix" ? p.choix!.find((c) => c.id === x)?.label ?? x : shortName(allCands.find((c) => c.id === x)?.nom ?? x);

  const open = PARIS.filter((p) => now < new Date(p.cloture));
  const placed = open.filter((p) => mine(p)).length;
  const next = open.filter((p) => !mine(p)).sort((a, b) => +new Date(a.cloture) - +new Date(b.cloture))[0];
  const myPoints = PARIS.reduce((a, p) => a + (scorePari(p, trancher(p, ctx.faits, now), mine(p), now)?.points ?? 0), 0);
  const counted = PARIS.filter((p) => scorePari(p, trancher(p, ctx.faits, now), undefined, now)).length;

  return (
    <div className="stack">
      <section className="card paris-hero">
        <div>
          <div className="eyebrow">Paris de la saison · {PARIS.length} paris · {PARIS_TOTAL} pts</div>
          <h2 style={{ fontSize: 26, marginTop: 6 }}>Parie tôt, ça rapporte plus.</h2>
          <p className="hint" style={{ marginTop: 6 }}>
            Chaque pari vaut {POINTS_PARI} pts. Il vaut 100 % à l&apos;ouverture et descend jusqu&apos;à 80 % à la clôture : changer
            d&apos;avis remet le compteur à l&apos;heure. Tout se tranche tout seul avec les chiffres officiels, et les paris de tes potes
            se dévoilent à la clôture.
          </p>
        </div>
        <div className="paris-stats">
          <div><b>{placed}/{open.length}</b><small>paris ouverts placés</small></div>
          <div><b>{fmtPts(Math.round(myPoints * 10) / 10)}</b><small>pts gagnés sur {counted * POINTS_PARI}</small></div>
          {next && <div><b>{countdown(new Date(next.cloture), now) ?? "–"}</b><small>avant la prochaine clôture</small></div>}
        </div>
      </section>

      {now < new Date(VERROU_CAMPAGNE) && (
        <div className="verrou">
          <span className="verrou-ic" aria-hidden="true">🔒</span>
          <div>
            <b>Grand verrouillage : lundi 5 avril 2027, début de la campagne officielle</b>
            <p className="hint">
              Tous les paris sur le 1er et le 2nd tour se figent à cette date. Les paris sur les parrainages ferment le 31 janvier.
              Le prono final, lui, reste modifiable jusqu&apos;au 17 avril.
            </p>
          </div>
          <span className="verrou-cd">{countdown(new Date(VERROU_CAMPAGNE), now)}</span>
        </div>
      )}

      {(Object.keys(PHASES) as Phase[]).map((ph) => {
        const list = PARIS.filter((p) => p.phase === ph);
        return (
          <section key={ph} className="stack" style={{ gap: 10 }}>
            <h2 className="phase-h"><span aria-hidden="true">{PHASES[ph].emoji}</span> {PHASES[ph].titre}</h2>
            {list.map((p) => (
              <PariCard key={p.id} pari={p} ctx={ctx} now={now} label={(x) => label(p, x)} mine={mine(p)} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
