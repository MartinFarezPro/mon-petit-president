import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/data";
import { JoinLeagueForm } from "@/app/ligues/forms";

export const metadata = { title: "Rejoindre une ligue" };

export default async function Rejoindre({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { profile } = await requireUser(`/rejoindre/${code}`);
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <TopBar profile={profile} />
      <section className="card stack">
        <h1 style={{ fontSize: 26 }}>Tu es invité·e dans une ligue 🎉</h1>
        <p className="hint">Confirme pour la rejoindre avec ton compte ({profile.pseudo}).</p>
        <JoinLeagueForm code={code.toUpperCase().slice(0, 6)} />
      </section>
    </main>
  );
}
