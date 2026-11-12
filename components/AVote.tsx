"use client";

import { useEffect, useState } from "react";

const COULEURS = ["#1f3fbf", "#ffffff", "#d5233b"];

type Bit = { left: number; delay: number; dur: number; rot: number; drift: number; w: number; h: number; c: string };

/** « A voté ! » : confettis bleu-blanc-rouge et bulletin glissé dans l'urne. Se relance à chaque nouveau `trigger`. */
export function AVote({ trigger }: { trigger: number | null | undefined }) {
  const [shown, setShown] = useState<number | null>(null);
  const [bits, setBits] = useState<Bit[]>([]);

  useEffect(() => {
    if (!trigger) return;
    setBits(Array.from({ length: 90 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      dur: 2.2 + Math.random() * 1.6,
      rot: Math.random() * 720 - 360,
      drift: Math.random() * 120 - 60,
      w: 6 + Math.random() * 7,
      h: 9 + Math.random() * 9,
      c: COULEURS[i % 3],
    })));
    setShown(trigger);
    const t = setTimeout(() => setShown(null), 4200);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!shown) return null;
  return (
    <div className="avote" role="status" aria-live="polite" onClick={() => setShown(null)}>
      <div className="avote-confetti" aria-hidden="true">
        {bits.map((b, i) => (
          <i key={i} style={{
            left: `${b.left}%`, width: b.w, height: b.h, background: b.c, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`,
            "--rot": `${b.rot}deg`, "--drift": `${b.drift}px`,
          } as React.CSSProperties} />
        ))}
      </div>
      <div className="avote-scene">
        <svg viewBox="0 0 220 230" width="220" height="230" aria-hidden="true">
          <defs>
            {/* Le bulletin n'est visible qu'au-dessus de la fente */}
            <clipPath id="avote-above"><rect x="0" y="0" width="220" height="112" /></clipPath>
          </defs>
          {/* Main + enveloppe qui descendent dans la fente */}
          <g clipPath="url(#avote-above)">
            <g className="avote-env">
              <rect x="86" y="40" width="48" height="66" rx="3" fill="#f4f1e8" stroke="#1f3fbf" strokeWidth="2" />
              <path d="M86 40 L110 62 L134 40" fill="none" stroke="#1f3fbf" strokeWidth="2" />
            </g>
            <g className="avote-hand">
              <path d="M70 20 q-6 22 10 34 l26 6 q10 2 14 -6 l6 -16 q4 -10 -6 -12 l-8 0 l-2 -18 q-2 -10 -12 -8 l-20 6 q-10 4 -8 14z"
                fill="#f2c6a0" stroke="#b9805a" strokeWidth="2" strokeLinejoin="round" />
              <rect x="62" y="-30" width="34" height="56" rx="10" fill="#1f3fbf" />
            </g>
          </g>
          {/* L'urne transparente */}
          <rect x="34" y="104" width="152" height="16" rx="4" fill="#3a3f5c" />
          <rect x="84" y="109" width="52" height="5" rx="2" fill="#0d1122" />
          <rect x="42" y="120" width="136" height="100" rx="6" fill="rgba(180,205,255,.18)" stroke="#9fb3e8" strokeWidth="3" />
          <rect x="42" y="214" width="136" height="8" rx="3" fill="#3a3f5c" />
          <g className="avote-pile">
            <rect x="60" y="196" width="40" height="16" rx="2" fill="#f4f1e8" stroke="#c9c2ad" transform="rotate(-8 80 204)" />
            <rect x="104" y="198" width="40" height="16" rx="2" fill="#f4f1e8" stroke="#c9c2ad" transform="rotate(6 124 206)" />
            <rect x="82" y="190" width="40" height="16" rx="2" fill="#f4f1e8" stroke="#c9c2ad" className="avote-drop" />
          </g>
          <g transform="translate(110 168)">
            <rect x="-24" y="-9" width="16" height="18" fill="#1f3fbf" />
            <rect x="-8" y="-9" width="16" height="18" fill="#ffffff" />
            <rect x="8" y="-9" width="16" height="18" fill="#d5233b" />
          </g>
        </svg>
        <p className="avote-title">A voté !</p>
        <p className="avote-sub">Ton prono est dans l&apos;urne. Tu peux le modifier jusqu&apos;à la clôture.</p>
      </div>
    </div>
  );
}
