import Link from 'next/link';

export default function PrivacyPage() {
  return <main className="container" style={{ maxWidth: 800 }}>
    <div className="card">
      <h1>Datenschutzhinweise</h1>
      <p>Diese Seite ist eine technische Vorlage und muss vor dem öffentlichen Betrieb an den tatsächlichen Betreiber, Hosting-Anbieter und die eingesetzten Dienste angepasst werden.</p>
      <h2>Welche Daten verarbeitet werden</h2>
      <ul>
        <li>Registrierungsdaten wie E-Mail-Adresse, Nutzername und Passwort-Hash</li>
        <li>eingereichte Beiträge, Quellen, Moderationsnotizen und Zeitpunkte</li>
        <li>bei Uploads: Datei, Dateiname, Dateityp, Größe, Lizenz, Urheber und Quelle</li>
        <li>technische Serverdaten, soweit sie vom Hosting-Anbieter protokolliert werden</li>
      </ul>
      <h2>Zweck und Zugriff</h2>
      <p>Die Daten dienen dem Betrieb, der Moderation, der Quellenverwaltung und der Veröffentlichung freigegebener Archivbeiträge. Nicht freigegebene Beiträge und Uploads sind nicht öffentlich zugänglich.</p>
      <h2>Betroffenenrechte</h2>
      <p>Für Auskunft, Berichtigung, Löschung, Einschränkung oder Widerspruch muss die zuständige Kontaktadresse des tatsächlichen Betreibers ergänzt werden.</p>
      <p className="small">Dies ist keine Rechtsberatung. Die Hinweise müssen vor dem Launch rechtlich geprüft und vervollständigt werden.</p>
      <Link href="/">Zur Startseite</Link>
    </div>
  </main>;
}
