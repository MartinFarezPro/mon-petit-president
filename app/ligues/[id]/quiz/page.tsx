import { headers } from "next/headers";
import { getCandidates, loadLeague } from "@/lib/data";
import { countdown, fmtDateTime } from "@/lib/format";
import { quizClos, quizOuvert, serie } from "@/lib/quiz";
import type { Quiz } from "@/lib/types";
import { ClosedQuiz } from "./ClosedQuiz";
import { QuizPlayer } from "./QuizPlayer";

export const metadata = { title: "Quiz" };

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await loadLeague(id);
  const all = await getCandidates(true);
  const now = new Date();
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  const published = ctx.quizzes.filter((z) => now >= new Date(z.ouverture));
  const current = published.find((z) => quizOuvert(z, now));
  const closed = published.filter((z) => quizClos(z, now)).sort((a, b) => +new Date(b.cloture) - +new Date(a.cloture));
  const upcoming = ctx.quizzes.filter((z) => now < new Date(z.ouverture)).sort((a, b) => +new Date(a.ouverture) - +new Date(b.ouverture))[0];
  const streak = serie(ctx.quizzes, ctx.quizQuestions, ctx.quizReponses, ctx.userId, now);
  const qsOf = (z: Quiz) => ctx.quizQuestions.filter((q) => q.quiz_id === z.id);

  return (
    <div className="stack">
      {current ? (
        <section className="card quiz-card">
          <div className="spread">
            <div>
              <div className="eyebrow">Quiz de la semaine · {current.titre}</div>
            </div>
            <div className="chips">
              {streak > 0 && <span className="chip warn" title="Quiz joués d'affilée">🔥 Série : {streak}</span>}
              <span className="chip me" title={fmtDateTime(current.cloture)}>⏳ {countdown(new Date(current.cloture), now)}</span>
            </div>
          </div>
          <QuizPlayer
            titre={current.titre}
            cloture={current.cloture}
            questions={qsOf(current)}
            candidates={all.map(({ id, nom, couleur, photo, parti }) => ({ id, nom, couleur, photo, parti }))}
            shareUrl={site}
            initial={Object.fromEntries(
              qsOf(current).flatMap((q) => {
                const r = ctx.quizReponses.find((x) => x.question_id === q.id && x.user_id === ctx.userId);
                const bonne = ctx.corrections[q.id];
                return r && bonne ? [[q.id, { choix: r.choix, bonne }]] : [];
              }),
            )}
          />
        </section>
      ) : (
        <section className="card">
          <div className="empty">
            <b>🗣️ Qui a dit ?</b>
            {upcoming
              ? <>Prochain quiz : « {upcoming.titre} », le {fmtDateTime(upcoming.ouverture)}.</>
              : <>Chaque semaine, 10 citations de la campagne à attribuer au bon candidat. Le prochain arrive bientôt.</>}
          </div>
        </section>
      )}

      {closed.map((z, i) => <ClosedQuiz key={z.id} quiz={z} ctx={ctx} open={i === 0} />)}
    </div>
  );
}
