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
          <div><b>🗳️ Le prono final</b><p className="hint">Classe les candidats, devine les scores, le vainqueur et la participation. 400 pts.</p></div>
          <div><b>🎯 Les paris</b><p className="hint">500 parrainages, surcotés, sous les 5 %… Parie tôt, ça rapporte plus. 350 pts.</p></div>
          <div><b>🗣️ Qui a dit ?</b><p className="hint">Chaque semaine, 10 citations de la campagne à attribuer au bon candidat.</p></div>
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
