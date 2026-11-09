"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Avatar } from "@/components/Avatar";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";
import { AVATARS, COULEURS_EQUIPE } from "@/lib/constants";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile, next }: { profile: Profile; next: string }) {
  const [state, action] = useActionState(updateProfile, null);
  const [couleur, setCouleur] = useState(profile.couleur);
  const [avatar, setAvatar] = useState(profile.avatar ?? "");
  const [pseudo, setPseudo] = useState(profile.pseudo);
  const [equipe, setEquipe] = useState(profile.equipe);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next} />
      <div className="row card tight" style={{ background: "var(--bg)" }}>
        <Avatar p={{ couleur, avatar, pseudo }} size={44} />
        <div><b>{equipe || "Ton équipe"}</b><div className="hint">{pseudo || "pseudo"}</div></div>
      </div>
      <div className="grid2">
        <div>
          <label htmlFor="pseudo">Pseudo</label>
          <input id="pseudo" name="pseudo" maxLength={30} required value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
        </div>
        <div>
          <label htmlFor="equipe">Nom d&apos;équipe</label>
          <input id="equipe" name="equipe" maxLength={40} placeholder="Ex. Les Insoumis du Dimanche" value={equipe} onChange={(e) => setEquipe(e.target.value)} />
        </div>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Couleur</legend>
        <div className="swatches">
          {COULEURS_EQUIPE.map((c) => (
            <label key={c} className="swatch" title={c} style={{ margin: 0 }}>
              <input type="radio" name="couleur" value={c} checked={couleur === c} onChange={() => setCouleur(c)} />
              <span style={{ background: c }} />
            </label>
          ))}
          {!COULEURS_EQUIPE.includes(couleur) && <input type="hidden" name="couleur" value={couleur} />}
        </div>
      </fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Avatar</legend>
        <div className="swatches">
          <label className="swatch emoji-pick" style={{ margin: 0 }} title="Initiale">
            <input type="radio" name="avatar" value="" checked={!avatar} onChange={() => setAvatar("")} />
            <span style={{ fontSize: 14, fontWeight: 800 }}>{(pseudo[0] ?? "?").toUpperCase()}</span>
          </label>
          {AVATARS.map((a) => (
            <label key={a} className="swatch emoji-pick" style={{ margin: 0 }}>
              <input type="radio" name="avatar" value={a} checked={avatar === a} onChange={() => setAvatar(a)} />
              <span>{a}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="row">
        <SubmitButton>Enregistrer</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
