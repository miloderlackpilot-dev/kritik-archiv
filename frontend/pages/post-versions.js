import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PostVersionsPage() {
  const router = useRouter();
  const [versions, setVersions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    const id = Number(router.query.id);
    if (!Number.isInteger(id)) return;
    axios.get(`${API}/api/archive/posts/${id}/versions`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setVersions(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Versionshistorie konnte nicht geladen werden'))
      .finally(() => setLoading(false));
  }, [router.isReady, router.query.id, router]);

  if (loading) return <main className="container"><p>Lädt …</p></main>;
  return <main className="container">
    <p><Link href="/dashboard">← Dashboard</Link></p>
    <h1>Versionshistorie</h1>
    {error && <div className="alert error">{error}</div>}
    {!error && !versions.length && <section className="card"><p>Für diesen Beitrag gibt es noch keine gespeicherten Vorgängerversionen.</p></section>}
    {!error && versions.map((version, index) => <section className="card" key={version.id} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Version {versions.length - index}</h2>
        <span className="small">{new Date(version.created_at).toLocaleString('de-DE')} · {version.changed_by_name}</span>
      </div>
      {version.change_reason && <p><strong>Änderungsgrund:</strong> {version.change_reason}</p>}
      <h3>{version.title}</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{version.content}</p>
      <p className="small">Einordnung: {version.claim_type}{version.event_date ? ` · Ereignisdatum: ${version.event_date}` : ''}</p>
      <button className="button secondary" onClick={() => setSelected(selected?.id === version.id ? null : version)}>Details {selected?.id === version.id ? 'ausblenden' : 'anzeigen'}</button>
      {selected?.id === version.id && <div style={{ marginTop: 12 }}><strong>Tags</strong><p className="small">{JSON.parse(version.tags || '[]').join(', ') || 'Keine Tags'}</p><p className="small">Ordner-ID: {version.folder_id}</p></div>}
    </section>)}
  </main>;
}
