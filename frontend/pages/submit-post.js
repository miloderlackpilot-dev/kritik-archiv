import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SubmitPostPage() {
  const router = useRouter();
  const [folders, setFolders] = useState([]);
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', folderId: '', claimType: 'research', eventDate: '', tags: '', sourceIds: [] });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/api/folders`),
      axios.get(`${API}/api/sources`, { headers })
    ]).then(([folderResponse, sourceResponse]) => {
      setFolders(folderResponse.data);
      setSources(sourceResponse.data);
    }).catch((err) => setError(err.response?.data?.error || 'Daten konnten nicht geladen werden'));
  }, [router]);

  const toggleSource = (id) => setForm((current) => ({
    ...current,
    sourceIds: current.sourceIds.includes(id)
      ? current.sourceIds.filter((sourceId) => sourceId !== id)
      : [...current.sourceIds, id]
  }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API}/api/posts`, {
        ...form,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Beitrag eingereicht. Er wird vor der Veröffentlichung moderiert.');
      setForm({ title: '', content: '', folderId: '', claimType: 'research', eventDate: '', tags: '', sourceIds: [] });
    } catch (err) {
      setError(err.response?.data?.error || 'Beitrag konnte nicht eingereicht werden');
    }
  };

  return <div className="container" style={{ maxWidth: 800 }}>
    <p><Link href="/dashboard">← Zum Dashboard</Link></p>
    <div className="card">
      <h1>Beitrag einreichen</h1>
      <p className="small">Bitte trenne belegte Fakten, Zitate und eigene Einordnung klar voneinander.</p>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}
      <form onSubmit={submit}>
        <label>Titel<input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 14 }}>Inhalt<textarea className="textarea" required rows={10} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 14 }}>Einordnung<select className="select" value={form.claimType} onChange={(e) => setForm({ ...form, claimType: e.target.value })}>
          <option value="fact">Belegte Tatsache</option><option value="quote">Wörtliches Zitat</option><option value="summary">Zusammenfassung</option><option value="opinion">Meinung/Einordnung</option><option value="research">Recherche</option><option value="unverified">Ungeprüfte Behauptung</option>
        </select></label>
        <label style={{ display: 'block', marginTop: 14 }}>Archivordner<select className="select" required value={form.folderId} onChange={(e) => setForm({ ...form, folderId: e.target.value })}>
          <option value="">Bitte auswählen</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select></label>
        <label style={{ display: 'block', marginTop: 14 }}>Ereignisdatum<input className="input" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></label>
        <label style={{ display: 'block', marginTop: 14 }}>Tags <span className="small">(durch Komma trennen)</span><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label>
        <fieldset style={{ marginTop: 18 }}><legend>Quellen auswählen (mindestens eine)</legend>
          {sources.length === 0 ? <p className="small">Noch keine Quellen vorhanden. Lege zuerst eine <Link href="/sources">Quelle</Link> an.</p> : sources.map((source) => <label key={source.id} style={{ display: 'block', marginTop: 8 }}><input type="checkbox" checked={form.sourceIds.includes(source.id)} onChange={() => toggleSource(source.id)} />{' '} {source.title || source.url} <span className="small">({source.license})</span></label>)}
        </fieldset>
        <button className="button" style={{ marginTop: 20 }} type="submit">Zur Moderation einreichen</button>
      </form>
    </div>
  </div>;
}
