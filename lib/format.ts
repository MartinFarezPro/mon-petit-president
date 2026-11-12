import { TZ } from "./constants";

export function fmtNum(x: number | null | undefined, digits = 1) {
  if (x == null || Number.isNaN(x)) return "–";
  return Number(x).toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 12 → "12", 12.5 → "12,5" */
export function fmtPts(x: number) {
  return fmtNum(x, Number.isInteger(x) ? 0 : 1);
}

export function fmtDelta(d: number | null) {
  if (d == null) return "";
  const s = d > 0.05 ? "+" : d < -0.05 ? "−" : "±";
  return s + fmtNum(Math.abs(d));
}

export function fmtDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00Z") : new Date(d);
  return date.toLocaleDateString("fr-FR", { timeZone: TZ, ...opts });
}

export function fmtDateTime(d: string | Date) {
  return new Date(d).toLocaleString("fr-FR", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

/** Décalage (minutes) de Paris par rapport à UTC à un instant donné. */
function parisOffsetMinutes(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** "2026-11-15T20:00" saisi à l'heure de Paris → ISO UTC. */
export function parisLocalToISO(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let off = parisOffsetMinutes(new Date(guess));
  let ts = guess - off * 60000;
  off = parisOffsetMinutes(new Date(ts));
  ts = guess - off * 60000;
  return new Date(ts).toISOString();
}

/** ISO → "YYYY-MM-DDTHH:mm" à l'heure de Paris (pour <input type="datetime-local">). */
export function isoToParisLocal(iso: string | Date): string {
  const d = new Date(iso);
  const p = new Date(d.getTime() + parisOffsetMinutes(d) * 60000);
  return p.toISOString().slice(0, 16);
}

export function countdown(target: Date, now = new Date()) {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;
  const d = Math.floor(ms / 864e5);
  const h = Math.floor(ms / 36e5) % 24;
  const m = Math.floor(ms / 6e4) % 60;
  if (d > 0) return `J-${d}`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  return `${m} min`;
}

export function displayName(p: { pseudo?: string; equipe?: string } | undefined) {
  if (!p) return "Joueur";
  return p.equipe || p.pseudo || "Joueur";
}

/** "Jean-Luc Mélenchon" → "Mélenchon", "Dominique de Villepin" → "Villepin", "Marine Le Pen" → "Le Pen" */
export function shortName(nom: string) {
  const w = nom.split(" ");
  return w.length > 2 && /^(Le|La)$/.test(w[w.length - 2]) ? w.slice(-2).join(" ") : w[w.length - 1];
}
