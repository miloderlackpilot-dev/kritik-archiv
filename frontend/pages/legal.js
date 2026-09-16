import Link from 'next/link';

export default function LegalPage() {
  return <div className="container" style={{ maxWidth: 800 }}><div className="card"><h1>Hinweise zu Quellen und Rechten</h1><p>Das Archiv verlinkt grundsätzlich auf Originalquellen und speichert keine fremden Inhalte ohne nachgewiesene Erlaubnis.</p><h2>Vor dem Einreichen</h2><ul><li>Original-URL und Abrufdatum dokumentieren.</li><li>Urheber und Lizenz angeben.</li><li>Nur notwendige kurze Zitate verwenden und sie klar kennzeichnen.</li><li>Keine Bezahlschranken oder Zugriffsschutz umgehen.</li><li>Bei Bildern, Videos und Screenshots nur eigene, gemeinfreie oder passend lizenzierte Inhalte verwenden.</li><li>Personenbezogene Daten und private Informationen nicht unnötig veröffentlichen.</li></ul><p className="small">Diese Hinweise sind keine Rechtsberatung. Im Zweifel muss der Beitrag vor der Veröffentlichung rechtlich geprüft werden.</p><Link href="/">Zur Startseite</Link></div></div>;
}
