import Link from 'next/link';
import axios from 'axios';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [folders, setFolders] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/folders').then((res) => setFolders(res.data)).catch(() => setFolders([]));
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="topbar-inner">
          <strong>Kritik-Archiv</strong>
          <div className="nav">
            <Link href="/">Start</Link>
            <Link href="/login">Login</Link>
            <Link href="/register">Registrieren</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </div>
      </div>

      <div className="container">
        <h1>Großes Archiv für kritische Vorfälle, Aussagen und Quellen</h1>
        <p className="small">Ziel: Übersichtlich, moderiert, durchsuchbar und ohne teure Software.</p>

        <div className="grid grid-3" style={{ marginTop: '24px' }}>
          {folders.map((folder) => (
            <div key={folder.id} className="card">
              <h3>{folder.name}</h3>
              <p>{folder.description || 'Keine Beschreibung'}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
