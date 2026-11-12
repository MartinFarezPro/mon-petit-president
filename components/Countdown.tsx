"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Compte à rebours jours / heures / minutes / secondes, mis à jour chaque seconde. */
export function Countdown({ target, label, doneLabel }: { target: string; label: string; doneLabel: string }) {
  const t = new Date(target).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = now == null ? null : Math.max(0, t - now);
  const parts = ms == null
    ? null
    : { j: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1000) % 60 };
  const done = ms === 0;

  return (
    <div className="countdown" role="timer" aria-live="off">
      <div className="cd-tiles" suppressHydrationWarning>
        {[
          ["j", parts ? String(parts.j) : "–", "jours"],
          ["h", parts ? pad(parts.h) : "––", "h"],
          ["m", parts ? pad(parts.m) : "––", "min"],
          ["s", parts ? pad(parts.s) : "––", "s"],
        ].map(([k, v, u]) => (
          <span key={k} className={`cd-tile ${k}`}>
            <b>{v}</b>
            <small>{u}</small>
          </span>
        ))}
      </div>
      <small className="cd-label">{done ? doneLabel : label}</small>
    </div>
  );
}
