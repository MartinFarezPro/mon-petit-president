import type { FormState } from "@/app/actions/state";

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) return <p className="notice err" role="alert">{state.error}</p>;
  if (state.ok) return <p className="notice ok" role="status">{state.ok}</p>;
  return null;
}
