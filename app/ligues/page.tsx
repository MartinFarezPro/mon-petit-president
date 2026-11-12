import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/data";
import { CreateLeagueForm, JoinLeagueForm } from "./forms";

export const metadata = { title: "Mes ligues" };

export default async function Ligues() {
  const { supabase, userId, profile } = await requireUser("/ligues");
  const { data } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, nom, admin_id, league_members(count))")
    .eq("user_id", userId);
  const leagues = (data ?? [])
    .map((r) => r.leagues as unknown as { id: string; nom: string; admin_id: string; league_members: { count: number }[] })
    .filter(Boolean);

  return (
    <main className="wrap">
      <TopBar profile={profile} />
      <header className="stack" style={{ gap: 6 }}>
        <div className="eyebrow">Salut {profile.pseudo} 👋</div>
        <h1 style={{ fontSize: 34 }}>Mes ligues</h1>
      </header>

      {leagues.length ? (
        <div className="stack" style={{ gap: 10 }}>
          {leagues.map((l) => (
            <Link key={l.id} href={`/ligues/${l.id}`} className="card tight spread" style={{ textDecoration: "none", color: "var(--ink)" }}>
              <div>
                <b style={{ fontFamily: "var(--display)", fontSize: 20 }}>{l.nom}</b>
                <div className="hint">{l.league_members?.[0]?.count ?? 1} joueurs{l.admin_id === userId ? " · tu es admin" : ""}</div>
              </div>
              <span className="pts">Ouvrir →</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card empty"><b>Aucune ligue pour l&apos;instant</b>Rejoins celle de tes potes avec leur code, ou crée la tienne.</div>
      )}

      <div className="grid2">
        <section className="card stack">
          <h2 style={{ fontSize: 20 }}>Rejoindre une ligue</h2>
          <JoinLeagueForm />
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 20 }}>Créer une ligue</h2>
          <p className="hint">
            {profile.is_superadmin
              ? "Superadmin : ligues illimitées, jusqu'à 500 joueurs chacune."
              : `Tu en administres ${leagues.filter((l) => l.admin_id === userId).length} sur 10 possibles. Une ligue accueille jusqu'à 50 joueurs, et tu peux en rejoindre autant que tu veux.`}
          </p>
          <CreateLeagueForm />
        </section>
      </div>
    </main>
  );
}
