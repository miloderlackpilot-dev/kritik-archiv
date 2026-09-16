import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SourcesPage() {
  const router = useRouter();
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState({ title: '', url: '', sourceType: 'article', license: 'unknown', attribution: '', notes: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    axios.get(`${API}/api/sources`, { headers: { Authorization: `Bearer ${token}` } }).then((res) => setSources(res.data)).catch(() => setError('Quellen konnten nicht geladen werden'));
  };
  useEffect(load, [router]);

  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await axios.post(`${API}/api/sources`, form, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setForm({ title: '', url: '', sourceType: 'article', license: 'unknown', attribution: '', notes: '' });
      setMessage('Quelle gespeichert.'); load();
    } catch (err) { setError(err.response?.data?.error || 'Quelle konnte nicht gespeichert werden'); }
  };

  return <div className="container" style={{ maxWidth: 800 }}>
    <p><Link href="/dashboard">← Zum Dashboard</Link></p>
    <div className="card"><h1>Quellenverwaltung</h1><p className="small">Nutze Original-URLs. Fremde Inhalte nicht ohne Lizenz kopieren.</p>
      {error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}
      <form onSubmit={submit}>
        <label>Titel<input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 12 }}>Original-URL<input className="input" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 12 }}>Typ<select className="select" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}><option value="article">Artikel</option><option value="video">Video</option><option value="document">Dokument</option><option value="press_release">Pressemitteilung</option><option value="official">Amtliche Quelle</option><option value="social">Social Media</option><option value="other">Sonstiges</option></select></label>
        <label style={{ display: 'block', marginTop: 12 }}>Lizenz/Status<input className="input" placeholder="z. B. CC BY 4.0, CC0, alle Rechte vorbehalten" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 12 }}>Urheber/Namensnennung<input className="input" value={form.attribution} onChange={(e) => setForm({ ...form, attribution: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 12 }}>Notizen<textarea className="textarea" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button className="button" style={{ marginTop: 16 }}>Quelle speichern</button>
      </form>
    </div>
    <div className="card" style={{ marginTop: 20 }}><h2>Meine Quellen</h2>{sources.map((source) => <div key={source.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}><strong>{source.title || source.url}</strong><br /><a href={source.url} target="_blank" rel="noreferrer">Originalquelle öffnen</a><div className="small">Lizenz: {source.license} | Urheber: {source.attribution || 'nicht angegeben'}</div></div>)}</div>
  </div>;
}
