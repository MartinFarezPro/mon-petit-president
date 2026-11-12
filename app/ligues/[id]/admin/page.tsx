import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { deleteLeague, kickMember, regenCode } from "@/app/actions/leagues";
import { Avatar } from "@/components/Avatar";
import { SubmitButton } from "@/components/SubmitButton";
import { loadLeague } from "@/lib/data";
import { CopyButton, RenameForm } from "./client";

export default async function Admin({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ nouvelle?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await loadLeague(id);
  if (!ctx.isAdmin) redirect(`/ligues/${id}`);

  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const invite = `${site}/rejoindre/${ctx.league.code_invitation}`;

  return (
    <div className="stack">
      {sp.nouvelle && <p className="notice ok">Ta ligue est créée ! Envoie le lien d&apos;invitation à tes potes.</p>}
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
            <p className="hint">Supprime définitivement la ligue, ses pronos et ses réactions (les paris et le quiz de chaque joueur restent dans ses autres ligues). Tape <b>SUPPRIMER</b> pour confirmer.</p>
            <input name="confirm" autoComplete="off" />
            <SubmitButton className="btn danger" pending="Suppression…">Supprimer définitivement</SubmitButton>
          </form>
        </details>
      </section>
    </div>
  );
}
