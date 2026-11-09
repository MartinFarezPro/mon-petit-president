"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/format";

export function Countdown({ target, label, doneLabel }: { target: string; label: string; doneLabel: string }) {
  const t = new Date(target);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const v = now ? countdown(t, now) : null;
  return (
    <div className="countdown">
      <b suppressHydrationWarning>{now ? (v ?? "Clos") : "…"}</b>
      <small>{now && !v ? doneLabel : label}</small>
    </div>
  );
}
