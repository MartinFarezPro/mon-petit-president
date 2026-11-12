import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { getSession } from "@/lib/data";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const { next, erreur } = await searchParams;
  const { profile, userId } = await getSession();
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/ligues";
  if (profile) redirect(safe);
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <TopBar profile={null} />
      <section className="card stack">
        <h1 style={{ fontSize: 28 }}>Connexion</h1>
        <p className="hint">Pas de mot de passe : on t&apos;envoie un code par e-mail. Même adresse = même compte, et tu restes connecté sur cet appareil.</p>
        {erreur && <p className="notice err">Le lien a expiré ou a déjà servi. Demande-en un nouveau.</p>}
        {userId && !profile && (
          <p className="notice err">Tu es bien connecté, mais ton profil est introuvable. Réessaie dans un instant ; si ça persiste, préviens l&apos;admin du site.</p>
        )}
        <LoginForm next={safe} />
      </section>
    </main>
  );
}
