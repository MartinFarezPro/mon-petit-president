/**
 * Clôture du prono final : samedi 17 avril 2027, 23 h 59 (Paris, UTC+2). Doit rester aligné avec prono_lock() en SQL.
 * PRONO_LOCK_OVERRIDE (côté serveur uniquement) sert aux tests de bout en bout : ne pas le définir en production.
 */
export const PRONO_LOCK = new Date(
  (typeof process !== "undefined" && process.env.PRONO_LOCK_OVERRIDE) || "2027-04-17T23:59:59+02:00",
);
export const PREMIER_TOUR = new Date("2027-04-18T08:00:00+02:00");
export const SECOND_TOUR = new Date("2027-05-02T08:00:00+02:00");

/** Les 4 favoris des sondages (pour le bonus « surprise »). */
export const FAVORIS = ["lepen", "melenchon", "philippe", "glucksmann"] as const;

export const EMOJIS = ["😂", "🔥", "🤡", "👏", "😱", "🧠"] as const;

export const COULEURS_EQUIPE = [
  "#1f3fbf", "#d5233b", "#1d8a52", "#e8a600", "#7b4bd1",
  "#0e8fa8", "#e0457f", "#3b3b3b", "#c25b12", "#5577c4",
];

export const AVATARS = ["🐓", "🎩", "🗳️", "🦁", "🐻", "🦊", "🐸", "🥖", "🧀", "🍷", "⚡", "🎯"];

export const PARTICIPATION_2022 = 73.7;

export const TZ = "Europe/Paris";

export function isLocked(now: Date = new Date()) {
  return now.getTime() >= PRONO_LOCK.getTime();
}
