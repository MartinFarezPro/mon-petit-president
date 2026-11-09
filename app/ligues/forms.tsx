"use client";

import { useActionState } from "react";
import { createLeague, joinLeague } from "@/app/actions/leagues";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function JoinLeagueForm({ code = "" }: { code?: string }) {
  const [state, action] = useActionState(joinLeague, null);
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="code">Code d&apos;invitation</label>
        <input id="code" name="code" required maxLength={6} defaultValue={code} placeholder="ABC123"
          style={{ fontFamily: "var(--mono)", letterSpacing: ".15em", textTransform: "uppercase" }} autoComplete="off" />
      </div>
      <SubmitButton pending="On te fait entrer…">Rejoindre</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CreateLeagueForm() {
  const [state, action] = useActionState(createLeague, null);
  return (
    <form action={action} className="stack">
      <div>
        <label htmlFor="nom">Nom de la ligue</label>
        <input id="nom" name="nom" required maxLength={60} placeholder="Les potes du dimanche" />
      </div>
      <SubmitButton className="btn ghost" pending="Création…">Créer et devenir admin</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
