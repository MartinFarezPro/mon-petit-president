# Mon Petit Président 🗳️

Le jeu de pronostics entre potes pour la présidentielle 2027, façon MPG.
1er tour le **18 avril 2027**, 2nd tour le **2 mai 2027**. Le prono final ferme le **17 avril 2027 à 23 h 59** (heure de Paris).

**Stack :** Next.js 16 (App Router, Server Actions) · Supabase (Auth par lien magique, Postgres et RLS) · Resend (SMTP) · Vercel.

## Fonctionnalités (V1)

- **Comptes** : lien magique par e-mail, profil avec pseudo, nom d'équipe, couleur et avatar.
- **Ligues** : création, code d'invitation à 6 caractères ou lien `/rejoindre/CODE`, un admin par ligue.
- **Prono final** : qualifiés, vainqueur, scores du 1er tour, capitaine (×2), surprise, participation. On peut le modifier jusqu'à la clôture. Les pronos des autres restent cachés jusque-là, **par la RLS côté serveur**.
- **Paris de la saison** : 14 paris communs à toutes les ligues (sondages, 500 parrainages, 1er et 2nd tour). Ils se tranchent tout seuls à partir des sondages, des parrainages et des résultats officiels. Un pari vaut 100 % à l'ouverture et 80 % à la clôture. Ceux des potes se dévoilent à la clôture.
- **Quiz « Qui a dit ? »** : chaque semaine, 10 citations à attribuer au bon candidat. La 1re réponse est définitive, la correction tombe aussitôt et la bonne réponse reste illisible en base tant qu'on n'a pas répondu. Grille à partager, série de semaines jouées.
- **Classement** : prono + paris + quiz, part du score parfait déjà tranché, détail par joueur. Animation « A voté ! » à l'enregistrement du prono.
- **Sondages** : moyenne de la semaine, évolution par rapport au relevé précédent, historique.
- **Chambrage** : réactions emoji (😂 🔥 🤡 👏 😱 🧠) et badges automatiques (Maillot jaune, Lanterne rouge, Nostradamus, Boulet de la semaine, Sans-faute, Assidu, Kamikaze).
- **Admin global** (superadmin) : candidats, relevés de sondages, résultats officiels.
- **PWA** : manifeste, icônes et service worker (page hors ligne). L'app s'installe sur l'écran d'accueil.

## Mise en route

### 1. Supabase

1. Crée un projet dans la région **Europe** (Frankfurt ou Paris).
2. Va dans **SQL Editor**, colle le contenu de `supabase/migrations/20261109000000_init.sql`, puis clique sur **Run**. Fais pareil, dans l'ordre, avec les migrations suivantes du dossier (`20261110000000_duels_portraits.sql` : portraits, Ruffin, Lalanne et classement par duels ; `20261112000000_paris_quiz.sql` : paris, parrainages et quiz ; `20261112010000_profils_manquants.sql` ; `20261113000000_verrou_campagne.sql` : dates de verrouillage). Le script crée les tables, la RLS, les fonctions, les 15 candidats et le sondage du 9 novembre 2026.
3. Récupère dans **Settings → API** l'URL du projet et la clé `anon`. Ne partage jamais la clé `service_role`.
4. Dans **Authentication → URL Configuration**, renseigne :
   - Site URL : `https://ton-domaine.fr`
   - Redirect URLs : `https://ton-domaine.fr/auth/confirm`, `http://localhost:3000/auth/confirm` et `https://*.vercel.app/auth/confirm`
5. Dans **Authentication → Emails → SMTP Settings**, configure Resend :
   - hôte `smtp.resend.com`, port `465`, utilisateur `resend`, mot de passe = ta clé API Resend
   - expéditeur : `pronos@ton-domaine.fr`
6. Après ta première connexion dans l'app, deviens superadmin. Dans le SQL Editor, lance :

   ```sql
   update profiles set is_superadmin = true
   where id = (select id from auth.users where email = 'martin.farez@hipto.com');
   ```

7. **Connexion par code.** Dans **Authentication → Emails**, colle `supabase/templates/magic-link.html` dans les modèles **Magic Link** et **Confirm signup**, avec le sujet « {{ .Token }} — ton code Mon Petit Président ». L'e-mail contient alors un code à 6 chiffres (indispensable pour l'app installée sur iPhone, qui ne partage pas les cookies de Safari) et un lien qui marche dans n'importe quel navigateur.
8. **Sessions.** Dans **Authentication → Sessions**, laisse *Time-box user sessions* et *Inactivity timeout* vides : les joueurs restent connectés tant qu'ils reviennent.

**Anti-pause.** Le plan gratuit de Supabase met le projet en pause après 7 jours sans activité. `vercel.json` déclare un cron quotidien qui appelle `/api/keepalive`. Optionnel : ajoute une variable `CRON_SECRET` dans Vercel pour que seul le cron puisse l'appeler.

### 2. Vercel

1. Importe le dépôt GitHub `martinfarez-a11y/mon-petit-president`.
2. Ajoute les variables d'environnement (voir `.env.example`) :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (par exemple `https://ton-domaine.fr`)
3. Déploie, puis branche le domaine dans **Settings → Domains**.

### 3. En local

```bash
cp .env.example .env.local   # puis remplis les valeurs
npm install
npm run dev                  # http://localhost:3000
```

## Mise à jour hebdo des sondages

Une Edge Function reçoit le relevé du lundi : `supabase/functions/ingest-poll`.

```bash
supabase functions deploy ingest-poll --no-verify-jwt --project-ref <ref>
supabase secrets set INGEST_SECRET=<longue-chaine-aleatoire> --project-ref <ref>
```

Appel (c'est ce que doit faire la tâche planifiée du lundi à 9 h 47) :

```bash
curl -X POST https://<ref>.supabase.co/functions/v1/ingest-poll \
  -H "x-ingest-secret: $INGEST_SECRET" -H "content-type: application/json" \
  -d '{"date":"2026-11-16","source":"Votons-2027","url":"https://votons-2027.fr/sondages",
       "valeurs":{"lepen":33.5,"melenchon":16.8,"philippe":13.9}}'
```

Les identifiants inconnus sont ignorés. Un relevé envoyé pour la même date et la même source remplace le précédent. On peut aussi saisir un relevé à la main dans `/admin`.

## Barème

La saison vaut environ 1000 pts : prono final 400 (40 %), paris 350 (35 %), quiz ~250 (25 %, 1 pt par citation, ~25 quiz).

| Prono final | Points |
|---|---|
| Chaque qualifié trouvé | 50 |
| Les deux qualifiés dans le bon ordre | +20 |
| Bon vainqueur | 80 |
| Score du vainqueur | 40 − 4 × écart (min. 0) |
| Scores du 1er tour | 100 pts partagés entre les candidats, chaque part × (1 − écart / 5) |
| Capitaine | sa part compte double |
| Participation | 30 − 6 × écart (min. 0) |
| Surprise (le mieux classé hors `lepen`, `melenchon`, `philippe` et `glucksmann`) | 30 |

Chaque pari vaut 25 pts × justesse × précocité. Pour un pari à plusieurs candidats, la justesse est la part des bons trouvés moins la part des mauvais cochés (min. 0). La précocité va de 1 à l'ouverture à 0,8 à la clôture. Un pari tranché avant sa clôture est annulé. Verrouillages : sondages le 31 décembre, parrainages le 31 janvier, scrutin au début de la campagne officielle (5 avril 2027) ; le prono final reste ouvert jusqu'au 17 avril.

Les calculs sont dans `lib/scoring.ts`, `lib/paris.ts` et `lib/quiz.ts`, les badges dans `lib/badges.ts`. Les dates des paris sont aussi dans la table `paris` : un test vérifie que les deux restent alignées.

### Données à saisir (superadmin, une fois pour toutes les ligues)

- **Quiz** : coller le JSON du quiz de la semaine dans `/admin` (modèle fourni).
- **Parrainages** : un relevé par publication du Conseil constitutionnel ; celui du 12 mars 2027 ou après est définitif.
- **Résultats officiels** : 1er tour, puis vainqueur, score et participation du 2nd tour.

## Sécurité (RLS)

- Chaque joueur n'écrit que ses propres lignes (`final_picks`, `paris_reponses`), et seulement avant la clôture.
- Les pronos des autres ne sont lisibles qu'à partir de `prono_lock()`, leurs paris qu'après la clôture du pari, leurs réponses au quiz qu'après la clôture du quiz. Ces règles sont appliquées en base.
- La colonne `quiz_questions.reponse` n'est pas lisible par les joueurs (droits de colonnes). On répond via `quiz_repondre` (une seule fois) et les corrections passent par `quiz_corrections`.
- Les statuts « a déposé » et « a répondu » passent par des fonctions `security definer` qui ne révèlent pas le contenu.
- Un joueur ne peut pas se promouvoir superadmin (droits de colonnes) ni changer l'admin d'une ligue.
- `candidates`, `polls` et `results` sont lisibles par tous et modifiables par les superadmins uniquement.

## Tests

```bash
npm test          # barème, paris, quiz, classement, badges, fuseau de Paris (vitest)
```

- `tests/sql/` contient les scénarios RLS : prono caché puis visible, droits d'admin, réponses après clôture, intrus… Ils tournent sur un Postgres 16 avec `00_supabase_shim.sql`.
- `tests/e2e/` contient un scénario Playwright sur une pile locale (Postgres, PostgREST et une fausse API d'auth). Il date d'avant les paris et le quiz et reste à mettre à jour.

## À faire plus tard

Fil de discussion par ligue, rappels par e-mail avant les clôtures, jokers, juge IA pour les paris non chiffrables (scandales, ralliements), monétisation.
