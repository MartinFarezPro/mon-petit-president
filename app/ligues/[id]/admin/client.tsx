"use client";

import { useActionState, useState } from "react";
import { renameLeague } from "@/app/actions/leagues";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function CopyButton({ text, label, className = "btn" }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          if (navigator.share && /Mobi/i.test(navigator.userAgent) && label.includes("message")) {
            await navigator.share({ text });
          } else {
            await navigator.clipboard.writeText(text);
          }
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {}
      }}
    >
      {done ? "Copié ✓" : label}
    </button>
  );
}

export function RenameForm({ leagueId, nom }: { leagueId: string; nom: string }) {
  const [state, action] = useActionState(renameLeague, null);
  return (
    <form action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="league_id" value={leagueId} />
      <label htmlFor="nom">Nom de la ligue</label>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input id="nom" name="nom" defaultValue={nom} maxLength={60} required />
        <SubmitButton className="btn ghost">Renommer</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
