export function Bareme() {
  return (
    <section className="card stack">
      <div className="section-h"><h2>Le barème du prono final</h2><span className="pts">max ≈ 280 pts</span></div>
      <div className="bareme">
        <div>Chaque qualifié trouvé pour le 2nd tour</div><div>25</div>
        <div>Les deux qualifiés dans le bon ordre</div><div>+10</div>
        <div>Bon vainqueur</div><div>40</div>
        <div>Score du vainqueur : 20 moins 2 pts par point d&apos;écart</div><div>≤ 20</div>
        <div>Score de chaque candidat au 1er tour : 10 moins 2 pts par point d&apos;écart</div><div>≤ 10</div>
        <div>Capitaine : ses points de score comptent double</div><div>×2</div>
        <div>Participation au 1er tour : 15 moins 3 pts par point d&apos;écart</div><div>≤ 15</div>
        <div>La surprise : le mieux classé hors des 4 favoris (Le Pen, Mélenchon, Philippe, Glucksmann)</div><div>15</div>
      </div>
      <p className="hint">
        Écarts en points de pourcentage, points arrondis à 0,1. Le prono se modifie librement jusqu&apos;au samedi 17 avril 2027 à 23 h 59
        (heure de Paris). Il reste caché jusque-là, puis tout le monde voit tout. Les points tombent dès la saisie des résultats officiels.
      </p>
      <h3 style={{ marginTop: 8 }}>Les journées</h3>
      <p className="hint">
        Chaque semaine, l&apos;admin de la ligue pose 3 à 5 mini-questions (qui monte dans les sondages, qui se déclare, qui obtient ses
        500 parrainages, qui gagne le débat…). Chacune a sa date de clôture et ses points. Question à choix : tous les points si c&apos;est
        la bonne réponse. Question chiffrée : points dégressifs selon l&apos;écart, jusqu&apos;à la tolérance fixée par l&apos;admin.
      </p>
      <p className="hint">
        Liste des candidats : déclarés ou testés dans les sondages au 9 novembre 2026. La liste officielle sera fixée par le Conseil
        constitutionnel au printemps 2027.
      </p>
    </section>
  );
}
