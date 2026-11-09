import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";

export function TopBar({ profile }: { profile: Profile | null }) {
  return (
    <div className="topbar">
      <Link href={profile ? "/ligues" : "/"} className="brand">
        <span className="tricolore" style={{ width: 28 }} aria-hidden="true"><i /><i /><i /></span>
        <span>Mon Petit <em>Président</em></span>
      </Link>
      {profile ? (
        <div className="row" style={{ gap: 6 }}>
          {profile.is_superadmin && <Link href="/admin" className="linkbtn">Admin</Link>}
          <Link href="/profil" className="row" style={{ gap: 6, textDecoration: "none", color: "var(--ink)" }} title="Mon profil">
            <Avatar p={profile} size={28} />
            <span className="hide-sm" style={{ fontWeight: 600, fontSize: 14 }}>{profile.pseudo}</span>
          </Link>
          <form action={signOut}>
            <button className="linkbtn" type="submit">Déconnexion</button>
          </form>
        </div>
      ) : (
        <Link href="/connexion" className="btn small">Se connecter</Link>
      )}
    </div>
  );
}
