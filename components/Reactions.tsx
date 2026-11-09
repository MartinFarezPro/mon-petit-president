import { toggleReaction } from "@/app/actions/reactions";
import { EMOJIS } from "@/lib/constants";
import type { Reaction } from "@/lib/types";

/** Réactions emoji sur un joueur dans un contexte (classement, prono final, journée). Fonctionne sans JS. */
export function Reactions({
  leagueId, contexte, cibleUser, reactions, me, path,
}: {
  leagueId: string; contexte: string; cibleUser: string; reactions: Reaction[]; me: string; path: string;
}) {
  const mine = reactions.filter((r) => r.contexte === contexte && r.cible_user === cibleUser);
  const counts = EMOJIS.map((e) => ({
    e,
    n: mine.filter((r) => r.emoji === e).length,
    byMe: mine.some((r) => r.emoji === e && r.user_id === me),
  }));
  const hidden = (e: string) => (
    <>
      <input type="hidden" name="league_id" value={leagueId} />
      <input type="hidden" name="contexte" value={contexte} />
      <input type="hidden" name="cible_user" value={cibleUser} />
      <input type="hidden" name="emoji" value={e} />
      <input type="hidden" name="path" value={path} />
    </>
  );
  const shown = counts.filter((c) => c.n > 0);
  const others = counts.filter((c) => c.n === 0);
  return (
    <div className="reacts">
      {shown.map((c) => (
        <form key={c.e} action={toggleReaction}>
          {hidden(c.e)}
          <button className="react" aria-pressed={c.byMe} title={c.byMe ? "Retirer ma réaction" : "Réagir"}>
            {c.e} {c.n}
          </button>
        </form>
      ))}
      {others.length > 0 && (
        <details>
          <summary className="react add" aria-label="Ajouter une réaction" style={{ listStyle: "none" }}>＋</summary>
          <div className="react-menu" style={{ marginTop: 4 }}>
            {others.map((c) => (
              <form key={c.e} action={toggleReaction}>
                {hidden(c.e)}
                <button className="react">{c.e}</button>
              </form>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
