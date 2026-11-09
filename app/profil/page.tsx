import { TopBar } from "@/components/TopBar";
import { requireUser } from "@/lib/data";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Mon profil" };

export default async function Profil({ searchParams }: { searchParams: Promise<{ bienvenue?: string; next?: string }> }) {
  const { profile } = await requireUser("/profil");
  const { bienvenue, next } = await searchParams;
  return (
    <main className="wrap" style={{ maxWidth: 560 }}>
      <TopBar profile={profile} />
      <section className="card stack">
        <h1 style={{ fontSize: 28 }}>{bienvenue ? "Bienvenue ! Présente-toi" : "Mon profil"}</h1>
        {bienvenue && <p className="hint">Ton pseudo et ton nom d&apos;équipe s&apos;affichent dans les classements.</p>}
        <ProfileForm profile={profile} next={bienvenue ? (next ?? "/ligues") : ""} />
      </section>
    </main>
  );
}
