import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ maxWidth: 480 }}>
      <section className="card empty">
        <b>Page introuvable</b>
        Ce lien n&apos;existe pas, ou tu ne fais pas partie de cette ligue.
        <div style={{ marginTop: 12 }}><Link href="/ligues" className="btn">Mes ligues</Link></div>
      </section>
    </main>
  );
}
