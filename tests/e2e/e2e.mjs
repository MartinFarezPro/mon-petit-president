// Scénario E2E (Playwright). Prérequis : Postgres 16 sur /var/tmp:5433 (base e2e + tests/sql/00_supabase_shim.sql + migration),
// PostgREST (tests/e2e/pgrst.conf), `node tests/e2e/gateway.mjs serve`, puis l'app buildée avec
// NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 sur le port 3000. Lancement : node tests/e2e/e2e.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { session } from "./gateway.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = "http://localhost:3000";
const sql = (q) => execFileSync("psql", ["-h", "/var/tmp", "-p", "5433", "-U", "postgres", "-d", "e2e", "-Atc", q]).toString().trim();
const U = {
  martin: ["11111111-1111-1111-1111-111111111111", "martin@hipto.com"],
  paul: ["22222222-2222-2222-2222-222222222222", "paul@ex.fr"],
  julie: ["33333333-3333-3333-3333-333333333333", "julie@ex.fr"],
};
sql(`create or replace function public.prono_lock() returns timestamptz language sql immutable as $$ select timestamptz '2027-04-17 23:59:59+02' $$;
     delete from polls where date > '2026-11-09'; delete from results; truncate auth.users cascade; insert into auth.users values ${Object.values(U).map(([i, e]) => `('${i}','${e}')`).join(",")};
     update profiles set is_superadmin = true where id = '${U.martin[0]}';`);

const browser = await chromium.launch();
const errors = [];
async function as(name, viewport = { width: 1100, height: 900 }) {
  const ctx = await browser.newContext({ viewport, locale: "fr-FR", timezoneId: "Europe/Paris" });
  const s = session(...U[name]);
  await ctx.addCookies([{ name: "sb-localhost-auth-token", value: "base64-" + Buffer.from(JSON.stringify(s)).toString("base64url"), url: BASE }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/favicon|Failed to load resource/.test(m.text()) && errors.push(`${name} console: ${m.text()}`));
  return page;
}
const step = (m) => console.log("✓", m);
const shot = (p, n) => p.screenshot({ path: `/var/tmp/e2e/shots/${n}.png`, fullPage: true });
const expectText = async (p, t) => { try { await p.getByText(t, { exact: false }).first().waitFor({ timeout: 8000 }); } catch { await shot(p, "ERREUR"); throw new Error(`Texte absent : ${t} (${p.url()})`); } };

// 0. Page publique + lien magique
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const p = await ctx.newPage();
  await p.goto(BASE); await shot(p, "00-accueil-mobile");
  await p.goto(`${BASE}/connexion`); await p.fill("#email", "nouveau@ex.fr"); await p.click("button[type=submit]");
  await expectText(p, "Lien envoyé à nouveau@ex.fr"); step("lien magique demandé");
  await ctx.close();
}

// 1. Martin : profil, création de ligue
const martin = await as("martin");
await martin.goto(`${BASE}/profil`);
await martin.fill("#pseudo", "Martin"); await martin.fill("#equipe", "Les Insoumis du Dimanche");
await martin.locator("label.swatch", { has: martin.locator('input[value="🐓"]') }).click();
await martin.click("text=Enregistrer"); await expectText(martin, "Profil enregistré"); step("profil Martin");
await martin.goto(`${BASE}/ligues`); await shot(martin, "01-ligues-vide");
await martin.fill("#nom", "Les potes du dimanche"); await martin.click("text=Créer et devenir admin");
await martin.waitForURL(/\/admin\?nouvelle=1/); await expectText(martin, "Ta ligue est créée");
const leagueUrl = martin.url().split("/admin")[0];
const code = (await martin.locator(".code").innerText()).trim();
step(`ligue créée, code ${code}`);

// 2. Paul et Julie rejoignent (code + lien)
const paul = await as("paul", { width: 390, height: 844 });
await paul.goto(`${BASE}/ligues`); await paul.fill("#code", code.toLowerCase()); await paul.click("button:has-text('Rejoindre')");
try { await paul.waitForURL(leagueUrl, { timeout: 8000 }); } catch (e) { await shot(paul, "ERREUR"); console.log(await paul.locator("main").innerText()); throw e; } step("Paul rejoint par code");
const julie = await as("julie");
await julie.goto(`${BASE}/rejoindre/${code}`); await julie.click("button:has-text('Rejoindre')");
await julie.waitForURL(leagueUrl); step("Julie rejoint par lien");
await paul.goto(`${BASE}/ligues/zzz`); await expectText(paul, "Page introuvable"); step("id de ligue invalide → 404");

// 3. Martin crée une journée
await martin.goto(`${leagueUrl}/admin`);
await martin.click("text=+ Qui monte le plus ?");
await martin.click("text=+ Score dans un sondage");
await martin.click("button:has-text('Créer la journée')");
await martin.waitForURL(/ok=journee/); step("journée créée");
await shot(martin, "02-admin");

// 4. Réponses
await paul.goto(`${leagueUrl}/journees`);
await paul.locator(".opt", { hasText: "Philippe" }).first().click();
await paul.locator("input.numfield").first().fill("33,5");
await paul.click("text=Valider mes réponses"); await expectText(paul, "2 réponses enregistrées");
await shot(paul, "03-journee-mobile");
await martin.goto(`${leagueUrl}/journees`);
await martin.locator(".opt", { hasText: "Pen" }).first().click();
await martin.locator("input.numfield").first().fill("35");
await martin.click("text=Valider mes réponses"); await expectText(martin, "2 réponses enregistrées");
await julie.goto(`${leagueUrl}/journees`);
await julie.locator(".opt", { hasText: "Philippe" }).first().click();
await julie.click("text=Valider mes réponses"); await expectText(julie, "1 réponse enregistrée");
step("3 joueurs ont répondu");

// 5. Clôture (on recule les dates) + correction
sql(`update matchdays set ouverture = now() - interval '3 day', cloture = now() - interval '1 hour'`);
await martin.goto(`${leagueUrl}/admin`);
await martin.locator("details.question[open] .opt", { hasText: "Philippe" }).first().click();
await martin.locator('details.question[open] input.numfield[name^="bonne_"]').fill("34");
await martin.click("text=Enregistrer les bonnes réponses"); await expectText(martin, "Bonnes réponses enregistrées");
step("journée corrigée");

// 6. Classement
await paul.goto(leagueUrl);
await expectText(paul, "Nostradamus"); await expectText(paul, "Boulet de la semaine");
const pts = await paul.locator("tbody tr").first().locator("td.num").last().innerText();
// Paul : 10 (Philippe) + 10×(1 − 0,5/2) = 17,5 ; Julie : 10 ; Martin : 10×(1 − 1/2) = 5
if (pts.trim() !== "17,5") throw new Error(`Paul devrait avoir 17,5, a ${pts}`);
step("classement : Paul 1er avec 17,5");
await paul.locator(".reacts summary").first().click();
await paul.locator(".react-menu button", { hasText: "🔥" }).first().click();
await paul.waitForLoadState("networkidle");
await expectText(paul, "🔥 1"); step("réaction 🔥");
await shot(paul, "04-classement-mobile");
await martin.goto(leagueUrl); await shot(martin, "05-classement-desktop");
await martin.goto(`${leagueUrl}/journees`); await shot(martin, "06-journee-close");

// 7. Prono final
await paul.goto(`${leagueUrl}/prono`);
await paul.selectOption("#q1", "lepen"); await paul.selectOption("#q2", "philippe");
await paul.selectOption("#gagnant", "philippe"); await paul.fill("#score_gagnant", "53");
await paul.fill('input[name="score_lepen"]', "33"); await paul.fill('input[name="score_philippe"]', "18");
await paul.locator('button[aria-label="Désigner Édouard Philippe capitaine"]').click();
await paul.selectOption("#surprise", "retailleau"); await paul.fill("#participation", "72");
await paul.click("text=Valider mon prono"); await expectText(paul, "Prono enregistré");
step("prono Paul");
await martin.goto(`${leagueUrl}/prono`);
await martin.selectOption("#q1", "lepen"); await martin.selectOption("#q2", "melenchon");
await martin.fill('input[name="score_lepen"]', "60"); await martin.fill('input[name="score_melenchon"]', "50");
const disabled = await martin.locator("button:has-text('Valider mon prono')").isDisabled();
if (!disabled) throw new Error("total > 100 % devrait bloquer");
await martin.fill('input[name="score_melenchon"]', "20");
await martin.click("text=Valider mon prono"); await expectText(martin, "Prono enregistré");
await shot(martin, "07-prono");
// Le prono de Paul est invisible pour Martin avant la clôture
const leaked = sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${U.martin[0]}"}', false); select count(*) from final_picks where user_id <> '${U.martin[0]}';`).split("\n").pop();
if (leaked !== "0") throw new Error("fuite de prono avant clôture !");
await martin.goto(leagueUrl); await expectText(martin, "Prono déposé"); step("pronos cachés, statut visible");

// 8. Superadmin : sondage + résultats après clôture
await martin.goto(`${BASE}/admin`);
await martin.fill('input[name="date"]', "2026-11-16");
await martin.fill('input[name="v_lepen"]', "33,2"); await martin.fill('input[name="v_philippe"]', "14,1"); await martin.fill('input[name="v_melenchon"]', "17");
await martin.click("text=Ajouter ce relevé"); await expectText(martin, "Sondage du 2026-11-16 ajouté");
await martin.goto(`${leagueUrl}/sondages`); await expectText(martin, "−0,8"); await expectText(martin, "+0,5");
await shot(martin, "08-sondages"); step("sondages + évolution");

sql(`create or replace function public.prono_lock() returns timestamptz language sql immutable as $$ select timestamptz '2020-01-01' $$`);
execFileSync("bash", ["-c", "fuser -k 3000/tcp; sleep 1; cd /home/claude/mon-petit-president && (PRONO_LOCK_OVERRIDE=2020-01-01T00:00:00Z nohup npx next start -p 3000 > /var/tmp/e2e/next-locked.log 2>&1 &) ; sleep 4"]);
await martin.goto(`${BASE}/admin`);
for (const [k, v] of Object.entries({ lepen: "32", philippe: "19", melenchon: "15", retailleau: "8" })) await martin.fill(`input[name="r_${k}"]`, v);
await martin.fill('input[name="participation"]', "71");
await martin.selectOption('select[name="gagnant"]', "philippe"); await martin.fill('input[name="score_gagnant"]', "54");
await martin.click("text=Enregistrer les résultats"); await expectText(martin, "Résultats officiels enregistrés");
step("résultats officiels");
await paul.goto(leagueUrl);
// Paul : 50+10 + scores (10−2×1=8 ; Philippe 10−2×1=8 ×2=16) 24 + surprise 15 + partic. 15−3=12 + 40 + 20−2=18 = 169 ; +17,5 journée
const paulTotal = (await paul.locator("tbody tr").first().locator("td.num").last().innerText()).trim();
if (paulTotal !== "186,5") throw new Error(`Paul devrait avoir 186,5, a ${paulTotal}`);
step("prono final compté : Paul 186,5");
await paul.goto(`${leagueUrl}/prono`); await expectText(paul, "Tous les pronos"); await expectText(paul, "consensus");
await shot(paul, "09-prono-clos-mobile");
sql(`create or replace function public.prono_lock() returns timestamptz language sql immutable as $$ select timestamptz '2027-04-17 23:59:59+02' $$`);
execFileSync("bash", ["-c", "fuser -k 3000/tcp; sleep 1; cd /home/claude/mon-petit-president && (nohup npx next start -p 3000 > /var/tmp/e2e/next.log 2>&1 &) ; sleep 4"]);

// 9. Non-admin ne voit pas l'admin
await paul.goto(`${leagueUrl}/admin`); if (!paul.url().endsWith(leagueUrl.split("3000")[1])) throw new Error("Paul a accès à l'admin");
await paul.goto(`${BASE}/admin`); if (!paul.url().endsWith("/ligues")) throw new Error("Paul a accès au superadmin");
step("pages admin protégées");

// Vérif débordement horizontal mobile
for (const path of ["", "/prono", "/journees", "/sondages", "/bareme"]) {
  await paul.goto(leagueUrl + path);
  const over = await paul.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) errors.push(`débordement horizontal ${over}px sur ${path || "/"}`);
}
step("pas de scroll horizontal mobile");
await browser.close();
if (errors.length) { console.log("ERREURS :\n" + errors.join("\n")); process.exit(1); }
console.log("E2E OK");
