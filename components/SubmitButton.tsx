"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children, pending: pendingLabel = "Envoi…", className = "btn", disabled, name, value,
}: {
  children: React.ReactNode; pending?: string; className?: string; disabled?: boolean; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} name={name} value={value}>
      {pending ? pendingLabel : children}
    </button>
  );
}
