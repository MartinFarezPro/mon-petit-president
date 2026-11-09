import Link from "next/link";
import { redirect } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { TopBar } from "@/components/TopBar";
import { PRONO_LOCK } from "@/lib/constants";
import { getSession } from "@/lib/data";

export default async function Home() {
  const { profile } = await getSession();
  if (profile) redirect("/ligues");
  return (
    <main className="wrap">
      <TopBar profile={null} />
      <header className="hero">
        <div>
          <div className="tricolore" aria-hidden="true"><i /><i /><i /></div>
          <div className="eyebrow" style={{ marginTop: 12 }}>Ligue entre potes · Présidentielle 2027</div>
          <h1>Mon Petit <em>Président</em></h1>
          <div className="dates" style={{ marginTop: 10 }}>
            <span>1er tour · dim. 18 avril 2027</span><span>2nd tour · dim. 2 mai 2027</span>
          </div>
        </div>
        <Countdown target={PRONO_LOCK.toISOString()} label="avant la clôture du prono final" doneLabel="les pronos sont figés" />
      </header>

      <section className="card stack">
        <h2 style={{ fontSize: 24 }}>Comme MPG, mais pour l&apos;Élysée</h2>
        <div className="grid3">
          <div><b>🗳️ Le prono final</b><p className="hint">Qualifiés, vainqueur, scores du 1er tour, capitaine, participation… jusqu&apos;à ~280 points.</p></div>
          <div><b>📅 Les journées</b><p className="hint">Chaque semaine, 3 à 5 mini-questions sur l&apos;actu de la campagne.</p></div>
          <div><b>🏆 Le classement</b><p className="hint">Général, par journée, badges et chambrage entre potes.</p></div>
        </div>
        <div className="row">
          <Link href="/connexion" className="btn">Jouer avec mes potes</Link>
          <Link href="/bareme" className="btn ghost">Voir le barème</Link>
        </div>
      </section>
      <footer className="foot">Pour le fun, entre amis. Aucune mise d&apos;argent.</footer>
    </main>
  );
}
