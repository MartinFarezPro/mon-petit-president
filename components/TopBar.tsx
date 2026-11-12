import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ profile }: { profile: Profile | null }) {
  return (
    <div className="topbar">
      <Link href={profile ? "/ligues" : "/"} className="brand">
        <span className="brand-flag" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-txt">
          <b>Mon petit<br />président</b>
          <small>Présidentielle 2027 · entre amis</small>
        </span>
      </Link>
      {profile ? (
        <div className="row" style={{ gap: 6 }}>
          <Link href="/ligues" className="linkbtn mes-ligues" title="Mes ligues : changer, rejoindre ou créer">
            <Icon name="ligues" size={18} /><span className="hide-sm">Mes ligues</span>
          </Link>
          <ThemeToggle />
          {profile.is_superadmin && <Link href="/admin" className="linkbtn">Admin</Link>}
          <Link href="/profil" className="row" style={{ gap: 6, textDecoration: "none", color: "var(--ink)" }} title="Mon profil">
            <Avatar p={profile} size={28} />
            <span className="hide-sm" style={{ fontWeight: 600, fontSize: 14 }}>{profile.pseudo}</span>
          </Link>
          <form action={signOut}>
            <button className="linkbtn" type="submit" aria-label="Déconnexion" title="Déconnexion">
              <span className="hide-sm">Déconnexion</span><span className="show-sm" aria-hidden="true">⏻</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="row" style={{ gap: 6 }}>
          <ThemeToggle />
          <Link href="/connexion" className="btn small">Se connecter</Link>
        </div>
      )}
    </div>
  );
}
