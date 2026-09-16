import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const labels = { fact: 'Belegte Tatsache', quote: 'Wörtliches Zitat', summary: 'Zusammenfassung', opinion: 'Meinung / Einordnung', research: 'Recherche', unverified: 'Ungeprüfte Behauptung' };

export default function PostPage() {
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [reportMessage, setReportMessage] = useState('');

  useEffect(() => {
    if (!router.query.id) return;
    axios.get(`${API}/api/posts/${router.query.id}`)
      .then((response) => { setPost(response.data); return axios.get(`${API}/api/media/post/${router.query.id}`); })
      .then((response) => setMedia(response.data))
      .catch((err) => setError(err.response?.data?.error || 'Beitrag konnte nicht geladen werden'));
  }, [router.query.id]);

  const submitReport = async (event) => {
    event.preventDefault();
    setReportMessage('');
    try {
      await axios.post(`${API}/api/archive/posts/${router.query.id}/report`, { reason, details }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setReportMessage('Meldung eingereicht.'); setReportOpen(false); setReason(''); setDetails('');
    } catch (err) { setReportMessage(err.response?.data?.error || 'Meldung konnte nicht eingereicht werden'); }
  };

  if (error) return <main className="container"><div className="alert error">{error}</div><Link href="/">← Zum Archiv</Link></main>;
  if (!post) return <main className="container"><p>Lädt …</p></main>;

  return <main className="container" style={{ maxWidth: 850 }}>
    <p><Link href="/">← Zum Archiv</Link></p>
    <article className="card">
      <h1>{post.title}</h1>
      <p className="small">{post.event_date ? `Ereignisdatum: ${post.event_date} · ` : ''}Einordnung: {labels[post.claim_type] || post.claim_type} · Ordner: {post.folder_name} · Autor: {post.author_name}</p>
      {post.topics?.length > 0 && <p className="small">Themen: {post.topics.map((topic) => topic.name).join(', ')}</p>}
      {post.persons?.length > 0 && <p className="small">Personen: {post.persons.map((person) => person.name).join(', ')}</p>}
      {post.organizations?.length > 0 && <p className="small">Organisationen: {post.organizations.map((organization) => organization.name).join(', ')}</p>}
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{post.content}</div>

      <h2 style={{ marginTop: 28 }}>Quellen</h2>
      {post.sources.map((source) => <div key={source.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a><div className="small">{source.source_type} · Lizenz: {source.license} · {source.attribution || 'Urheber nicht angegeben'}</div></div>)}

      {media.length > 0 && <><h2 style={{ marginTop: 28 }}>Dateien und Medien</h2><div className="grid">{media.map((item) => <div className="card" key={item.id} style={{ padding: 12 }}>{item.mime_type.startsWith('image/') && <img src={`${API}/api/media/${item.id}/file`} alt={item.original_name} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} />}<p style={{ marginTop: 8 }}><a href={`${API}/api/media/${item.id}/file`} target="_blank" rel="noreferrer">{item.original_name}</a></p><p className="small">Lizenz: {item.license} · Urheber: {item.attribution}</p>{item.source_url && <p className="small"><a href={item.source_url} target="_blank" rel="noreferrer">Originalquelle</a></p>}</div>)}</div></>}

      {reportMessage && <div className="alert" style={{ marginTop: 20 }}>{reportMessage}</div>}
      <div style={{ marginTop: 28, borderTop: '1px solid #e5e7eb', paddingTop: 18 }}>
        {!reportOpen ? <button className="button secondary" onClick={() => setReportOpen(true)}>Beitrag melden</button> : <form onSubmit={submitReport}><h2>Beitrag melden</h2><label>Grund<select className="select" required value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Bitte auswählen</option><option value="source">Quelle fehlerhaft</option><option value="factual_error">Sachlicher Fehler</option><option value="copyright">Urheberrecht</option><option value="other">Sonstiger Grund</option></select></label><label style={{ display: 'block', marginTop: 12 }}>Details<textarea className="textarea" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} /></label><div style={{ display: 'flex', gap: 10, marginTop: 12 }}><button className="button" type="submit">Meldung senden</button><button className="button secondary" type="button" onClick={() => setReportOpen(false)}>Abbrechen</button></div></form>}
      </div>
    </article>
  </main>;
}
