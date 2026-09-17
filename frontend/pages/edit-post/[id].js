import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const labels = { fact: 'Belegte Tatsache', quote: 'Wörtliches Zitat', summary: 'Zusammenfassung', opinion: 'Meinung / Einordnung', research: 'Recherche', unverified: 'Ungeprüfte Behauptung' };

export default function EditPostPage() {
  const router = useRouter();
  const [folders, setFolders] = useState([]);
  const [post, setPost] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', folderId: '', claimType: 'research', eventDate: '', tags: '' });
  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!router.query.id) return;
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/api/archive/my-posts/${router.query.id}`, { headers }),
      axios.get(`${API}/api/folders`)
    ]).then(([p, f]) => {
      setPost(p.data); setFolders(f.data);
      setForm({ title: p.data.title, content: p.data.content, folderId: String(p.data.folder_id), claimType: p.data.claim_type, eventDate: p.data.event_date || '', tags: (p.data.tags || []).join(', ') });
    }).catch((e) => setError(e.response?.data?.error || 'Beitrag konnte nicht geladen werden'));
  }, [router.query.id, router]);

  const save = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    try {
      await axios.patch(`${API}/api/archive/posts/${router.query.id}`, { ...form, tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean), changeReason }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setMessage(post?.status === 'rejected' ? 'Beitrag geändert und erneut zur Moderation eingereicht.' : 'Beitrag gespeichert.');
    } catch (e) { setError(e.response?.data?.error || 'Beitrag konnte nicht gespeichert werden'); }
  };

  if (error) return <main className="container"><div className="alert error">{error}</div><Link href="/my-posts">← Meine Beiträge</Link></main>;
  if (!post) return <main className="container"><p>Lädt …</p></main>;
  return <main className="container" style={{ maxWidth: 850 }}>
    <p><Link href="/my-posts">← Meine Beiträge</Link></p>
    <div className="card">
      <h1>Beitrag bearbeiten</h1>
      <p className="small">Aktueller Status: {post.status}. Änderungen an freigegebenen Beiträgen durch Moderatoren oder Admins bleiben möglich.</p>
      {message && <div className="alert success">{message}</div>}{error && <div className="alert error">{error}</div>}
      <form onSubmit={save}>
        <label>Titel<input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 14 }}>Inhalt<textarea className="textarea" required rows={14} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 14 }}>Einordnung<select className="select" value={form.claimType} onChange={(e) => setForm({ ...form, claimType: e.target.value })}>{Object.entries(labels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label style={{ display: 'block', marginTop: 14 }}>Archivordner<select className="select" required value={form.folderId} onChange={(e) => setForm({ ...form, folderId: e.target.value })}>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label style={{ display: 'block', marginTop: 14 }}>Ereignisdatum<input className="input" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 14 }}>Tags <span className="small">(durch Komma trennen)</span><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 14 }}>Änderungsgrund <span className="small">(für die Versionshistorie)</span><input className="input" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} /></label>
        <button className="button" style={{ marginTop: 20 }} type="submit">Speichern</button>
      </form>
    </div>
  </main>;
}
