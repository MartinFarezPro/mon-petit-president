import { PARIS, PARIS_TOTAL, PHASES, POINTS_PARI } from "@/lib/paris";
import { QUIZ_PREVUS, QUIZ_TAILLE } from "@/lib/quiz";
import { BAREME } from "@/lib/scoring";

export function Bareme() {
  const quiz = QUIZ_PREVUS * QUIZ_TAILLE;
  const total = BAREME.prono + PARIS_TOTAL + quiz;
  return (
    <div className="stack">
      <section className="card stack">
        <div className="section-h"><h2>Le barème de la saison</h2><span className="pts">~{total} pts</span></div>
        <p>
          Celui qui a tout bon au prono final, à tous les paris et à tous les quiz fait le score parfait. Tout se calcule tout seul
          avec les chiffres officiels : personne n&apos;arbitre.
        </p>
        <div className="saison-bar" aria-hidden="true">
          <span className="seg prono" style={{ width: `${(BAREME.prono / total) * 100}%` }} />
          <span className="seg paris" style={{ width: `${(PARIS_TOTAL / total) * 100}%` }} />
          <span className="seg quiz" style={{ width: `${(quiz / total) * 100}%` }} />
        </div>
        <div className="saison-legend static">
          <span><i className="prono" />Prono final <b>{BAREME.prono}</b> · 40 %</span>
          <span><i className="paris" />Paris <b>{PARIS_TOTAL}</b> · 35 %</span>
          <span><i className="quiz" />Quiz <b>~{quiz}</b> · 25 %</span>
        </div>
      </section>

      <section className="card stack">
        <div className="section-h"><h2><i className="dotk prono" /> Le prono final</h2><span className="pts">{BAREME.prono} pts</span></div>
        <div className="bareme">
          <div>Chaque qualifié trouvé pour le 2nd tour</div><div>{BAREME.qualifie}</div>
          <div>Les deux qualifiés dans le bon ordre</div><div>+{BAREME.ordre}</div>
          <div>Bon vainqueur</div><div>{BAREME.vainqueur}</div>
          <div>Score du vainqueur : {BAREME.scoreVainqueur} moins 4 pts par point d&apos;écart</div><div>≤ {BAREME.scoreVainqueur}</div>
          <div>Scores du 1er tour : {BAREME.scores} pts partagés entre les candidats, chaque part baisse de 20 % par point d&apos;écart</div><div>≤ {BAREME.scores}</div>
          <div>Capitaine : sa part compte double</div><div>×2</div>
          <div>Participation au 1er tour : {BAREME.participation} moins 6 pts par point d&apos;écart</div><div>≤ {BAREME.participation}</div>
          <div>La surprise : le mieux classé hors des 4 favoris (Le Pen, Mélenchon, Philippe, Glucksmann)</div><div>{BAREME.surprise}</div>
        </div>
        <p className="hint">
          Modifiable librement jusqu&apos;au samedi 17 avril 2027 à 23 h 59 (heure de Paris), caché jusque-là. Les points tombent dès
          les résultats officiels.
        </p>
      </section>

      <section className="card stack">
        <div className="section-h"><h2><i className="dotk paris" /> Les paris</h2><span className="pts">{PARIS.length} × {POINTS_PARI} = {PARIS_TOTAL} pts</span></div>
        <div className="bareme">
          <div>Pari à un seul choix : bonne réponse (ex æquo acceptés)</div><div>{POINTS_PARI}</div>
          <div>Pari à plusieurs candidats : part des bons trouvés moins part des mauvais cochés (jamais sous 0). Tout cocher rapporte 0.</div><div>≤ {POINTS_PARI}</div>
          <div>Précocité : un pari vaut 100 % à l&apos;ouverture et descend jusqu&apos;à 80 % à la clôture. Changer d&apos;avis remet le compteur à l&apos;heure.</div><div>×0,8 à ×1</div>
        </div>
        <ul className="bareme-list">
          {(Object.keys(PHASES) as (keyof typeof PHASES)[]).map((ph) => (
            <li key={ph}>
              <b>{PHASES[ph].emoji} {PHASES[ph].titre}</b>
              <span className="hint"> · {PARIS.filter((p) => p.phase === ph).map((p) => p.question).join(" · ")}</span>
            </li>
          ))}
        </ul>
        <p className="hint">
          Sources : sondages relevés chaque semaine, parrainages publiés par le Conseil constitutionnel, résultats du ministère de
          l&apos;Intérieur. Un pari tranché avant sa clôture est annulé pour tout le monde.
        </p>
      </section>

      <section className="card stack">
        <div className="section-h"><h2><i className="dotk quiz" /> Le quiz « Qui a dit ? »</h2><span className="pts">1 pt par citation</span></div>
        <p>
          Chaque semaine, {QUIZ_TAILLE} citations de la campagne à attribuer au bon candidat. La 1re réponse est définitive et la
          correction tombe aussitôt. Les points comptent au classement à la clôture du quiz. Environ {QUIZ_PREVUS} quiz d&apos;ici
          l&apos;élection.
        </p>
      </section>

      <p className="hint">
        Liste des candidats : déclarés ou testés dans les sondages en novembre 2026. La liste officielle sera fixée par le Conseil
        constitutionnel au printemps 2027.
      </p>
    </div>
  );
}
