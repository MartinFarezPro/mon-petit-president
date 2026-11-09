import { redirect } from "next/navigation";
import { deletePoll } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { TopBar } from "@/components/TopBar";
import { getCandidates, getPolls, getResults, requireUser } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { AddCandidateForm, CandidatesForm, PollForm, ResultsForm } from "./forms";

export const metadata = { title: "Administration" };

export default async function AdminGlobal() {
  const { profile } = await requireUser("/admin");
  if (!profile.is_superadmin) redirect("/ligues");
  const [candidates, polls, results] = await Promise.all([getCandidates(true), getPolls(), getResults()]);
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
        <div className="section-h"><h2>Candidats</h2><span className="hint">décocher « actif » retire un candidat des formulaires</span></div>
        <CandidatesForm candidates={candidates} />
        <details>
          <summary>Ajouter un candidat</summary>
          <div style={{ marginTop: 10 }}><AddCandidateForm /></div>
        </details>
      </section>

      <section className="card stack">
        <div className="section-h"><h2>Résultats officiels</h2><span className="hint">1er tour d&apos;abord, 2nd tour ensuite</span></div>
        <p className="notice info">Les points du prono final se calculent dès l&apos;enregistrement, pour toutes les ligues.</p>
        <ResultsForm candidates={candidates} results={results} />
      </section>
    </main>
  );
}
