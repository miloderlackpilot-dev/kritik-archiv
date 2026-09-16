import Link from 'next/link';

export default function DashboardPage() {
  return <div className="container"><div className="card"><h1>Dashboard</h1><p>Verwalte deine Einreichungen und Quellen.</p><div className="grid grid-3"><Link href="/submit-post"><div className="card"><h3>Beitrag einreichen</h3><p>Mit mindestens einer Quelle zur Moderation senden.</p></div></Link><Link href="/sources"><div className="card"><h3>Quellen verwalten</h3><p>Originalquellen, Lizenzen und Namensnennungen speichern.</p></div></Link><Link href="/admin"><div className="card"><h3>Moderation</h3><p>Nur für Admins und Moderatoren.</p></div></Link></div></div></div>;
}
