"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, verifyCode } from "@/app/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [sent, send] = useActionState(sendMagicLink, null);
  const [checked, check] = useActionState(verifyCode, null);
  const codeStep = Boolean(sent?.ok);

  return (
    <div className="stack">
      <form action={send} className="stack">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email">Ton e-mail</label>
          <input
            id="email" name="email" type="email" autoComplete="email" required placeholder="toi@exemple.fr"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <SubmitButton pending="Envoi…" className={codeStep ? "btn ghost" : "btn"}>
          {codeStep ? "Renvoyer un e-mail" : "Recevoir mon code"}
        </SubmitButton>
        <FormMessage state={sent} />
      </form>

      {codeStep && (
        <form action={check} className="stack">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email.trim().toLowerCase()} />
          <div>
            <label htmlFor="code">Code reçu par e-mail</label>
            <input
              id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,10}"
              maxLength={10} required placeholder="123456" autoFocus
              style={{ fontSize: 24, letterSpacing: "0.3em", textAlign: "center" }}
            />
          </div>
          <SubmitButton pending="Vérification…">Me connecter</SubmitButton>
          <FormMessage state={checked} />
        </form>
      )}
    </div>
  );
}
