import { Countdown } from "@/components/Countdown";
import { LeagueTabs } from "@/components/LeagueTabs";
import { TopBar } from "@/components/TopBar";
import { PRONO_LOCK } from "@/lib/constants";
import { loadLeague } from "@/lib/data";
import { questionCloture } from "@/lib/scoring";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  return { title: ctx.league.nom };
}

export default async function LeagueLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const now = Date.now();
  // Journées ouvertes où il me reste des questions sans réponse
  const openCount = ctx.matchdays.filter((m) => {
    if (now < +new Date(m.ouverture)) return false;
    const qs = ctx.questions.filter((q) => q.matchday_id === m.id && now < questionCloture(q, m).getTime());
    return qs.some((q) => !ctx.answers.some((a) => a.question_id === q.id && a.user_id === ctx.userId));
  }).length;

  return (
    <main className="wrap">
      <TopBar profile={ctx.me} />
      <header className="hero">
        <div>
          <div className="tricolore" aria-hidden="true"><i /><i /><i /></div>
          <div className="eyebrow" style={{ marginTop: 12 }}>Ligue · {ctx.members.length} joueur{ctx.members.length > 1 ? "s" : ""}</div>
          <h1 style={{ fontSize: "clamp(28px, 6vw, 44px)" }}>{ctx.league.nom}</h1>
          <div className="dates" style={{ marginTop: 10 }}>
            <span>1er tour · dim. 18 avril</span><span>2nd tour · dim. 2 mai</span>
          </div>
        </div>
        <Countdown target={PRONO_LOCK.toISOString()} label="avant la clôture du prono final (17 avril, 23 h 59)" doneLabel="les pronos sont figés" />
      </header>
      <LeagueTabs base={`/ligues/${id}`} isAdmin={ctx.isAdmin} openCount={openCount} />
      {children}
      <footer className="foot">Pour le fun, entre amis · Sondages mis à jour chaque lundi.</footer>
    </main>
  );
}
