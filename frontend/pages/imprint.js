import Link from 'next/link';

export default function ImprintPage() {
  return <main className="container" style={{ maxWidth: 800 }}>
    <div className="card">
      <h1>Impressum</h1>
      <p><strong>Hinweis zur Vorlage:</strong> Vor einer Veröffentlichung müssen hier die vollständigen Pflichtangaben des tatsächlichen Betreibers eingetragen werden.</p>
      <h2>Betreiber</h2>
      <p>[Vorname Nachname oder Organisation]<br />[Straße und Hausnummer]<br />[PLZ Ort]<br />[Land]</p>
      <h2>Kontakt</h2>
      <p>E-Mail: [Kontaktadresse ergänzen]</p>
      <h2>Verantwortlich für Inhalte</h2>
      <p>[Name und ladungsfähige Anschrift ergänzen]</p>
      <p className="small">Keine Platzhalter stehen lassen: Diese Seite ist vor dem öffentlichen Launch vollständig auszufüllen und rechtlich zu prüfen.</p>
      <Link href="/">Zur Startseite</Link>
    </div>
  </main>;
}
