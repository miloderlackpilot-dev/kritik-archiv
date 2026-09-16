import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    axios.get('http://localhost:5000/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUser(res.data))
      .catch(() => router.push('/login'));
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="container">
      <div className="topbar" style={{ margin: '-24px -24px 24px -24px' }}>
        <div className="topbar-inner">
          <strong>Dashboard</strong>
          <div className="nav">
            <Link href="/">Start</Link>
            <button className="button secondary" onClick={logout}>Logout</button>
          </div>
        </div>
      </div>

      {user ? (
        <>
          <h1>Willkommen, {user.username}</h1>
          <p className="small">Rolle: {user.role} | Verifiziert: {user.verified ? 'Ja' : 'Nein'}</p>

          <div className="grid grid-3" style={{ marginTop: 24 }}>
            <div className="card">
              <h3>Neuen Beitrag einreichen</h3>
              <p>Ein Beitrag wird zunächst geprüft und freigegeben.</p>
            </div>
            <div className="card">
              <h3>Meine Einträge</h3>
              <p>Einträge erscheinen hier später als Archivübersicht.</p>
            </div>
            <div className="card">
              <h3>Ordner</h3>
              <p>Hier erscheinen später Themen- und Quellordner.</p>
            </div>
          </div>
        </>
      ) : (
        <p>Lädt...</p>
      )}
    </div>
  );
}
