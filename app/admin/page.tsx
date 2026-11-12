import { redirect } from "next/navigation";
import { deleteParrainages, deletePoll, deleteQuiz } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { TopBar } from "@/components/TopBar";
import { getCandidates, getParrainages, getPolls, getQuizzes, getResults, requireUser } from "@/lib/data";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { AddCandidateForm, CandidatesForm, ParrainagesForm, PollForm, QuizImportForm, ResultsForm } from "./forms";

export const metadata = { title: "Administration" };

export default async function AdminGlobal() {
  const { profile } = await requireUser("/admin");
  if (!profile.is_superadmin) redirect("/ligues");
  const [candidates, polls, results, parrainages, quiz] = await Promise.all([getCandidates(true), getPolls(), getResults(), getParrainages(), getQuizzes()]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="wrap">
      <TopBar profile={profile} />
      <header className="stack" style={{ gap: 6 }}>
        <div className="eyebrow">Toutes les ligues</div>
        <h1 style={{ fontSize: 32 }}>Administration</h1>
        <p className="hint">Candidats, sondages et résultats officiels sont communs à toutes les ligues.</p>
      </header>

      <section className="card stack">
        <div className="section-h"><h2>Sondages</h2><span className="hint">la tâche du lundi les ajoute automatiquement</span></div>
        <PollForm candidates={candidates} last={polls[0]?.valeurs ?? {}} today={today} />
        {polls.length > 0 && (
          <details>
            <summary>Relevés enregistrés ({polls.length})</summary>
            <div className="stack" style={{ gap: 6, marginTop: 8 }}>
              {polls.map((p) => (
                <form key={p.id} action={deletePoll} className="spread card tight">
                  <span>{fmtDate(p.date)} · {p.source} · {Object.keys(p.valeurs).length} candidats</span>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="linkbtn" pending="…">Supprimer</SubmitButton>
                </form>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Quiz « Qui a dit ? »</h2><span className="hint">un quiz par semaine, 10 citations</span></div>
        <p className="hint">
          Colle le quiz au format JSON. Les choix sont des identifiants de candidats ({candidates.map((c) => c.id).join(", ")}).
          Ils sont mélangés à l&apos;import. Dates à l&apos;heure de Paris. La bonne réponse reste invisible des joueurs jusqu&apos;à ce qu&apos;ils répondent.
        </p>
        <QuizImportForm example={QUIZ_EXEMPLE} />
        {quiz.quizzes.length > 0 && (
          <details>
            <summary>Quiz publiés ({quiz.quizzes.length})</summary>
            <div className="stack" style={{ gap: 6, marginTop: 8 }}>
              {quiz.quizzes.map((z) => (
                <form key={z.id} action={deleteQuiz} className="spread card tight">
                  <span>
                    <b>{z.titre}</b> · {quiz.questions.filter((q) => q.quiz_id === z.id).length} questions
                    <small className="hint" style={{ display: "block" }}>{fmtDateTime(z.ouverture)} → {fmtDateTime(z.cloture)}</small>
                  </span>
                  <input type="hidden" name="id" value={z.id} />
                  <SubmitButton className="linkbtn" pending="…">Supprimer</SubmitButton>
                </form>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Parrainages</h2><span className="hint">publications du Conseil constitutionnel</span></div>
        <p className="hint">
          Cumul par candidat à chaque publication. Le relevé daté du {fmtDate("2027-03-12")} ou après est considéré comme définitif
          et tranche les paris « 500 parrainages ».
        </p>
        <ParrainagesForm candidates={candidates} last={parrainages[0]?.valeurs ?? {}} today={today} />
        {parrainages.length > 0 && (
          <details>
            <summary>Relevés enregistrés ({parrainages.length})</summary>
            <div className="stack" style={{ gap: 6, marginTop: 8 }}>
              {parrainages.map((p) => (
                <form key={p.date} action={deleteParrainages} className="spread card tight">
                  <span>{fmtDate(p.date)} · {Object.keys(p.valeurs).length} candidats</span>
                  <input type="hidden" name="date" value={p.date} />
                  <SubmitButton className="linkbtn" pending="…">Supprimer</SubmitButton>
                </form>
              ))}
            </div>
          </details>
        )}
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Candidats</h2><span className="hint">décocher « actif » retire un candidat des formulaires</span></div>
        <CandidatesForm candidates={candidates} />
        <details>
          <summary>Ajouter un candidat</summary>
          <div style={{ marginTop: 10 }}><AddCandidateForm /></div>
        </details>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Résultats officiels</h2><span className="hint">1er tour d&apos;abord, 2nd tour ensuite</span></div>
        <p className="notice info">Les points du prono final et des paris du 1er et du 2nd tour se calculent dès l&apos;enregistrement, pour toutes les ligues.</p>
        <ResultsForm candidates={candidates} results={results} />
      </section>
    </main>
  );
}

const QUIZ_EXEMPLE = JSON.stringify({
  titre: "Semaine du 16 novembre",
  ouverture: "2026-11-16T08:00",
  cloture: "2026-11-22T23:59",
  questions: [
    {
      citation: "La citation exacte, sans guillemets",
      contexte: "France Inter, matinale",
      date: "2026-11-10",
      choix: ["lepen", "melenchon", "philippe", "glucksmann"],
      reponse: "melenchon",
    },
  ],
}, null, 2);
