import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { deleteLeague, kickMember, regenCode } from "@/app/actions/leagues";
import { deleteMatchday } from "@/app/actions/matchdays";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { loadLeague } from "@/lib/data";
import { fmtDateTime, isoToParisLocal, shortName } from "@/lib/format";
import { questionCloture } from "@/lib/scoring";
import { CopyButton, CorrectionForm, MatchdayEditor, RenameForm } from "./client";

export default async function Admin({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ nouvelle?: string; ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await loadLeague(id);
  if (!ctx.isAdmin) redirect(`/ligues/${id}`);

  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const invite = `${site}/rejoindre/${ctx.league.code_invitation}`;
  const now = new Date();
  const candidateNames = ctx.candidates.map((c) => shortName(c.nom));
  const sorted = [...ctx.matchdays].sort((a, b) => +new Date(b.cloture) - +new Date(a.cloture));

  return (
    <div className="stack">
      {sp.nouvelle && <p className="notice ok">Ta ligue est créée ! Envoie le lien d&apos;invitation à tes potes.</p>}
      {sp.ok === "journee" && <p className="notice ok">Journée enregistrée.</p>}
      {sp.erreur === "confirmation" && <p className="notice err">Tape SUPPRIMER pour confirmer la suppression.</p>}

      <section className="card stack">
        <div className="section-h"><h2>Inviter des potes</h2></div>
        <div className="spread">
          <div>
            <div className="hint">Code d&apos;invitation</div>
            <div className="code">{ctx.league.code_invitation}</div>
          </div>
          <div className="row">
            <CopyButton text={invite} label="Copier le lien" />
            <CopyButton
              text={`Rejoins ma ligue « ${ctx.league.nom} » sur Mon Petit Président 🗳️ ${invite}`}
              label="Copier le message"
              className="btn ghost"
            />
          </div>
        </div>
        <p className="hint mono" style={{ wordBreak: "break-all" }}>{invite}</p>
        <form action={regenCode}>
          <input type="hidden" name="league_id" value={id} />
          <SubmitButton className="linkbtn" pending="…">Changer le code (l&apos;ancien ne marchera plus)</SubmitButton>
        </form>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Nouvelle journée</h2><span className="hint">3 à 5 questions conseillées</span></div>
        <MatchdayEditor leagueId={id} candidateNames={candidateNames} defaults={{
          titre: `Journée ${ctx.matchdays.length + 1}`,
          ouverture: isoToParisLocal(now),
          cloture: isoToParisLocal(nextSunday(now)),
        }} />
      </section>

      {sorted.length > 0 && (
        <section className="card stack">
          <div className="section-h"><h2>Journées</h2><span className="hint">corriger, modifier, supprimer</span></div>
          {sorted.map((m, i) => {
            const qs = ctx.questions.filter((q) => q.matchday_id === m.id);
            const closed = qs.every((q) => questionCloture(q, m) <= now) && new Date(m.cloture) <= now;
            const toCorrect = qs.filter((q) => questionCloture(q, m) <= now && q.bonne_reponse == null).length;
            const answers = new Set(ctx.answerStatus.filter((a) => qs.some((q) => q.id === a.question_id)).map((a) => a.user_id)).size;
            return (
              <details key={m.id} id={`j-${m.id}`} className="question" open={toCorrect > 0 || i === 0}>
                <summary className="spread" style={{ display: "flex" }}>
                  <span>{m.titre}</span>
                  <span className="chips">
                    <span className="chip">{answers}/{ctx.members.length} joueurs</span>
                    {toCorrect > 0 ? <span className="chip warn">{toCorrect} à corriger</span> : closed ? <span className="chip ok">Close</span> : <span className="chip">Clôture {fmtDateTime(m.cloture)}</span>}
                  </span>
                </summary>
                <div className="stack" style={{ marginTop: 12 }}>
                  <h3>Bonnes réponses</h3>
                  <CorrectionForm leagueId={id} matchdayId={m.id} questions={qs} />
                  <details>
                    <summary>Modifier la journée</summary>
                    <div style={{ marginTop: 12 }}>
                      <MatchdayEditor leagueId={id} candidateNames={candidateNames} matchdayId={m.id} defaults={{
                        titre: m.titre, ouverture: isoToParisLocal(m.ouverture), cloture: isoToParisLocal(m.cloture),
                        questions: qs.map((q) => ({
                          id: q.id, intitule: q.intitule, type: q.type, choix: q.options.choix ?? [],
                          tolerance: q.options.tolerance ?? null, unite: q.options.unite ?? "", points: q.points,
                          cloture: q.cloture ? isoToParisLocal(q.cloture) : "",
                        })),
                      }} />
                    </div>
                  </details>
                  <form action={deleteMatchday}>
                    <input type="hidden" name="league_id" value={id} />
                    <input type="hidden" name="matchday_id" value={m.id} />
                    <SubmitButton className="btn danger small" pending="Suppression…">Supprimer la journée et ses réponses</SubmitButton>
                  </form>
                </div>
              </details>
            );
          })}
        </section>
      )}

      <section className="card stack">
        <div className="section-h"><h2>Joueurs</h2><span className="hint">{ctx.members.length}</span></div>
        <div className="tbl">
          <table>
            <tbody>
              {ctx.members.map((p) => (
                <tr key={p.id}>
                  <td><div className="team"><Avatar p={p} size={26} /><div><b>{p.equipe || p.pseudo}</b><small>{p.pseudo}</small></div></div></td>
                  <td className="num">
                    {p.id === ctx.userId ? <span className="chip me">Admin</span> : (
                      <form action={kickMember}>
                        <input type="hidden" name="league_id" value={id} />
                        <input type="hidden" name="user_id" value={p.id} />
                        <SubmitButton className="linkbtn" pending="…">Exclure</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Réglages</h2></div>
        <RenameForm leagueId={id} nom={ctx.league.nom} />
        <details>
          <summary style={{ color: "var(--rouge)" }}>Supprimer la ligue</summary>
          <form action={deleteLeague} className="stack" style={{ marginTop: 10 }}>
            <input type="hidden" name="league_id" value={id} />
            <p className="hint">Supprime définitivement la ligue, ses journées, réponses et pronos. Tape <b>SUPPRIMER</b> pour confirmer.</p>
            <input name="confirm" autoComplete="off" />
            <SubmitButton className="btn danger" pending="Suppression…">Supprimer définitivement</SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}

function nextSunday(from: Date) {
  // Dimanche suivant, 20 h (heure de Paris, approx. via UTC+1/+2 géré à l'affichage)
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7 || 7));
  d.setUTCHours(19, 0, 0, 0);
  return d;
}
