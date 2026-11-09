# Mon Petit Président 🗳️

Le jeu de pronostics entre potes pour la présidentielle 2027, façon MPG.
1er tour le **18 avril 2027**, 2nd tour le **2 mai 2027**. Le prono final ferme le **17 avril 2027 à 23 h 59** (heure de Paris).

**Stack :** Next.js 16 (App Router, Server Actions) · Supabase (Auth par lien magique, Postgres et RLS) · Resend (SMTP) · Vercel.

## Fonctionnalités (V1)

- **Comptes** : lien magique par e-mail, profil avec pseudo, nom d'équipe, couleur et avatar.
- **Ligues** : création, code d'invitation à 6 caractères ou lien `/rejoindre/CODE`, un admin par ligue.
- **Prono final** : qualifiés, vainqueur, scores du 1er tour, capitaine (×2), surprise, participation. On peut le modifier jusqu'à la clôture. Les pronos des autres restent cachés jusque-là, **par la RLS côté serveur**.
- **Journées hebdo** : l'admin crée 3 à 5 questions, à choix ou chiffrées, avec des modèles rapides. Chaque question peut avoir sa propre clôture. Les réponses des autres s'affichent à la clôture.
- **Classement** : général, par journée, et détail des points de chaque joueur.
- **Sondages** : moyenne de la semaine, évolution par rapport au relevé précédent, historique.
- **Chambrage** : réactions emoji (😂 🔥 🤡 👏 😱 🧠) et badges automatiques (Maillot jaune, Lanterne rouge, Nostradamus, Boulet de la semaine, Sans-faute, Assidu, Kamikaze).
- **Admin global** (superadmin) : candidats, relevés de sondages, résultats officiels.
- **PWA** : manifeste, icônes et service worker (page hors ligne). L'app s'installe sur l'écran d'accueil.

## Mise en route

### 1. Supabase

1. Crée un projet dans la région **Europe** (Frankfurt ou Paris).
2. Va dans **SQL Editor**, colle le contenu de `supabase/migrations/20261109000000_init.sql`, puis clique sur **Run**. Le script crée les tables, la RLS, les fonctions, les 15 candidats et le sondage du 9 novembre 2026.
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

Optionnel : dans **Authentication → Emails → Magic Link**, tu peux traduire le modèle en français, par exemple avec le sujet « Ton lien pour Mon Petit Président ».

### 2. Vercel

1. Importe le dépôt GitHub `MartinFarezPro/mon-petit-president`.
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

| Élément | Points |
|---|---|
| Chaque qualifié trouvé | 25 |
| Les deux qualifiés dans le bon ordre | +10 |
| Bon vainqueur | 40 |
| Score du vainqueur | 20 − 2 × écart (min. 0) |
| Score de chaque candidat au 1er tour | 10 − 2 × écart (min. 0) |
| Capitaine | ses points de score comptent double |
| Participation | 15 − 3 × écart (min. 0) |
| Surprise (le mieux classé hors `lepen`, `melenchon`, `philippe` et `glucksmann`) | 15 |

Pour les journées, une question à choix rapporte tous ses points si la réponse est bonne (l'admin peut cocher plusieurs bonnes réponses). Une question chiffrée rapporte `points × (1 − écart / tolérance)`, avec un minimum de 0.

Le calcul est dans `lib/scoring.ts` et les badges dans `lib/badges.ts`.

## Sécurité (RLS)

- Chaque joueur n'écrit que ses propres lignes (`final_picks`, `answers`), et seulement avant la clôture.
- Les pronos des autres ne sont lisibles qu'à partir de `prono_lock()`. Les réponses aux questions ne le sont qu'après la clôture de la question. Ces deux règles sont appliquées en base.
- Les statuts « a déposé » et « a répondu » passent par des fonctions `security definer` qui ne révèlent pas le contenu.
- Un joueur ne peut pas se promouvoir superadmin (droits de colonnes) ni changer l'admin d'une ligue.
- `candidates`, `polls` et `results` sont lisibles par tous et modifiables par les superadmins uniquement.

## Tests

```bash
npm test          # barème, journées, classement, badges, fuseau de Paris (vitest)
```

- `tests/sql/` contient les scénarios RLS : prono caché puis visible, droits d'admin, réponses après clôture, intrus… Ils tournent sur un Postgres 16 avec `00_supabase_shim.sql`.
- `tests/e2e/` contient un scénario Playwright complet sur une pile locale (Postgres, PostgREST et une fausse API d'auth) : 3 joueurs, journée, correction, classement, prono final, sondages, résultats, droits et rendu mobile.

## À faire plus tard

Fil de discussion par ligue, rappels par e-mail avant les clôtures, jokers (changer de capitaine, doubler une journée).
