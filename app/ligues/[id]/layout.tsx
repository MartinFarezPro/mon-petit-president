import { Countdown } from "@/components/Countdown";
import { LeagueTabs } from "@/components/LeagueTabs";
import { TopBar } from "@/components/TopBar";
import { PRONO_LOCK } from "@/lib/constants";
import { loadLeague } from "@/lib/data";
import { PARIS } from "@/lib/paris";
import { quizOuvert } from "@/lib/quiz";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  return { title: ctx.league.nom };
}

export default async function LeagueLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const now = new Date();
  // Paris ouverts pas encore placés, citations du quiz en cours sans réponse
  const parisTodo = PARIS.filter((p) => now >= new Date(p.ouverture) && now < new Date(p.cloture)
    && !ctx.parisReponses.some((r) => r.user_id === ctx.userId && r.pari_id === p.id)).length;
  const current = ctx.quizzes.find((z) => quizOuvert(z, now));
  const quizTodo = current
    ? ctx.quizQuestions.filter((q) => q.quiz_id === current.id && !ctx.quizReponses.some((r) => r.question_id === q.id && r.user_id === ctx.userId)).length
    : 0;

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
      <LeagueTabs base={`/ligues/${id}`} isAdmin={ctx.isAdmin} parisTodo={parisTodo} quizTodo={quizTodo} />
      {children}
      <footer className="foot">Pour le fun, entre amis · Sondages mis à jour chaque lundi.</footer>
    </main>
  );
}
