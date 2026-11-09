"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(sendMagicLink, null);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email">Ton e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="toi@exemple.fr" />
      </div>
      <SubmitButton pending="Envoi du lien…">Recevoir mon lien magique</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
