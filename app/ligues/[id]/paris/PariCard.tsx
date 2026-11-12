import { Avatar } from "@/components/Avatar";
import { Portrait } from "@/components/Portrait";
import type { LeagueContext } from "@/lib/data";
import { countdown, fmtDateTime, fmtPts } from "@/lib/format";
import { annule, scorePari, trancher, type Pari } from "@/lib/paris";
import type { PariReponse, Profile } from "@/lib/types";
import { PariPicker } from "./PariPicker";

export type ParisCtx = Pick<LeagueContext, "faits" | "parisReponses" | "parisStatus" | "members" | "profilesById" | "candidates" | "league">;

export function PariCard({ pari, ctx, now, label, mine }: {
  pari: Pari; ctx: ParisCtx; now: Date; label: (x: string) => string; mine: PariReponse | undefined;
}) {
  const closed = now >= new Date(pari.cloture);
  const verdict = trancher(pari, ctx.faits, now);
  const score = scorePari(pari, verdict, mine, now);
  const isVoid = closed && verdict && annule(pari, verdict);
  const bettors = new Set(ctx.parisStatus.filter((s) => s.pari_id === pari.id).map((s) => s.user_id));
  const left = countdown(new Date(pari.cloture), now);
  const urgent = !closed && +new Date(pari.cloture) - +now < 3 * 864e5;

  const state = !closed ? "open" : isVoid ? "void" : score ? (score.justesse >= 0.999 ? "win" : score.justesse > 0 ? "half" : "lose") : "wait";

  return (
    <article className={`card pari ${state}`}>
      <header className="spread" style={{ alignItems: "flex-start" }}>
        <div className="row" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
          <span className="pari-emoji" aria-hidden="true">{pari.emoji}</span>
          <div>
            <h3>{pari.question}</h3>
            <p className="hint" style={{ marginTop: 4 }}>{pari.aide}</p>
          </div>
        </div>
        <span className={`chip ${urgent ? "bad" : closed ? "" : "me"}`} title={fmtDateTime(pari.cloture)}>
          {closed ? "🔒 Clos" : `⏳ ${left}`}
        </span>
      </header>

      {!closed ? (
        <>
          <PariPicker pari={pari} candidates={ctx.candidates} initial={mine ? { reponse: mine.reponse, verrouille_le: mine.verrouille_le } : null} leagueId={ctx.league.id} />
          <p className="hint">
            {bettors.size}/{ctx.members.length} pote{ctx.members.length > 1 ? "s ont" : " a"} parié · clôture {fmtDateTime(pari.cloture)}
          </p>
        </>
      ) : (
        <>
          {verdict && !isVoid && (
            <div className={`verdict ${state}`}>
              <b>{state === "win" ? "✅ Bien vu !" : state === "half" ? "🟡 En partie" : "❌ Raté"}</b>
              <span>{verdict.detail}</span>
              {score && mine && (
                <span className="mono">
                  +{fmtPts(score.points)} pts <small className="hint">(justesse {Math.round(score.justesse * 100)} % × {mine.verrouille_le ? `cadenas ${Math.round(score.precocite * 100)} %` : "pas verrouillé 50 %"})</small>
                </span>
              )}
            </div>
          )}
          {isVoid && <div className="verdict void"><b>Pari annulé</b><span>Tranché avant même sa clôture : il ne compte pour personne.</span></div>}
          {!verdict && <p className="notice info">En attente des chiffres officiels : il se tranchera tout seul.</p>}
          <Reveal pari={pari} ctx={ctx} label={label} bonnes={verdict && !isVoid ? verdict.bonnes : null} />
        </>
      )}
    </article>
  );
}

/** Qui a parié quoi dans la ligue (visible après la clôture). */
export function Reveal({ pari, ctx, label, bonnes }: {
  pari: Pari; ctx: ParisCtx; label: (x: string) => string; bonnes: string[] | null;
}) {
  const reps = ctx.parisReponses.filter((r) => r.pari_id === pari.id);
  const groups = new Map<string, Profile[]>();
  for (const r of reps) {
    const keys = r.reponse.length ? r.reponse : ["__aucun"];
    for (const k of keys) {
      const p = ctx.profilesById[r.user_id];
      if (p) groups.set(k, [...(groups.get(k) ?? []), p]);
    }
  }
  const sansPari = ctx.members.filter((m) => !reps.some((r) => r.user_id === m.id));
  if (!reps.length) return <p className="hint">Personne n&apos;a parié dans la ligue.</p>;
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    <div className="reveal">
      {sorted.map(([k, ps]) => {
        const c = ctx.faits.candidates.find((x) => x.id === k);
        const good = bonnes?.includes(k) ?? null;
        return (
          <div key={k} className={`reveal-row ${good === true ? "good" : good === false ? "bad" : ""}`}>
            <span className="reveal-k">
              {c && pari.kind !== "choix" ? <Portrait c={c} size={26} /> : null}
              <b>{k === "__aucun" ? "Personne" : label(k)}</b>
              {good === true && " ✓"}
            </span>
            <span className="reveal-who">{ps.map((p) => <Avatar key={p.id} p={p} size={24} />)}</span>
          </div>
        );
      })}
      {sansPari.length > 0 && (
        <div className="reveal-row muted">
          <span className="reveal-k"><b>Sans pari</b></span>
          <span className="reveal-who">{sansPari.map((p) => <Avatar key={p.id} p={p} size={24} />)}</span>
        </div>
      )}
    </div>
  );
}
