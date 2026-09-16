import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    axios.get(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setUser(response.data))
      .catch(() => router.push('/login'));
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (error) return <main className="container"><div className="alert error">{error}</div></main>;
  if (!user) return <main className="container"><p>Lädt …</p></main>;

  const canModerate = ['admin', 'moderator'].includes(user.role);

  return <main className="container">
    <div className="topbar" style={{ margin: '-24px -24px 24px -24px' }}>
      <div className="topbar-inner"><strong>Dashboard</strong><div className="nav"><Link href="/">Archiv</Link><button className="button secondary" onClick={logout}>Logout</button></div></div>
    </div>
    <h1>Willkommen, {user.username}</h1>
    <p className="small">Rolle: {user.role} · Verifiziert: {user.verified ? 'Ja' : 'Nein'}</p>
    <div className="grid grid-3" style={{ marginTop: 24 }}>
      <Link href="/submit-post"><div className="card"><h3>Beitrag einreichen</h3><p>Mit mindestens einer Quelle zur Moderation senden.</p></div></Link>
      <Link href="/sources"><div className="card"><h3>Quellen verwalten</h3><p>Originalquellen, Lizenzen und Namensnennungen speichern.</p></div></Link>
      <Link href="/upload"><div className="card"><h3>Datei hinzufügen</h3><p>Rechtmäßig verwendete Bilder oder PDFs anhängen.</p></div></Link>
      {canModerate && <Link href="/admin"><div className="card"><h3>Moderation</h3><p>Beiträge prüfen und freigeben.</p></div></Link>}
    </div>
  </main>;
}
