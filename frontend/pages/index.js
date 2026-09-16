import Link from 'next/link';
import axios from 'axios';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const labels = { fact: 'Belegte Tatsache', quote: 'Wörtliches Zitat', summary: 'Zusammenfassung', opinion: 'Meinung / Einordnung', research: 'Recherche', unverified: 'Ungeprüfte Behauptung' };

export default function HomePage() {
  const [data, setData] = useState({ posts: [], total: 0, pages: 0 });
  const [folders, setFolders] = useState([]);
  const [topics, setTopics] = useState([]);
  const [query, setQuery] = useState('');
  const [folderId, setFolderId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [claimType, setClaimType] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([axios.get(`${API}/api/folders`), axios.get(`${API}/api/archive/topics`)]).then(([f, t]) => {
      setFolders(f.data); setTopics(t.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20', sort: sort === 'oldest' ? 'oldest' : 'newest' });
    if (query.trim()) params.set('q', query.trim());
    if (folderId) params.set('folderId', folderId);
    if (topicId) params.set('topicId', topicId);
    if (claimType) params.set('claimType', claimType);
    axios.get(`${API}/api/archive/posts?${params}`).then((response) => setData(response.data)).catch(() => setData({ posts: [], total: 0, pages: 0 })).finally(() => setLoading(false));
  }, [query, folderId, topicId, claimType, sort, page]);

  const reset = () => { setQuery(''); setFolderId(''); setTopicId(''); setClaimType(''); setSort('newest'); setPage(1); };

  return <>
    <div className="topbar"><div className="topbar-inner"><strong>Kritik-Archiv</strong><div className="nav"><Link href="/">Archiv</Link><Link href="/login">Login</Link><Link href="/register">Registrieren</Link><Link href="/dashboard">Dashboard</Link></div></div></div>
    <main className="container">
      <h1>Öffentliches Kritik-Archiv</h1>
      <p className="small">Freigegebene Beiträge mit nachvollziehbaren Originalquellen.</p>
      <div className="card">
        <input className="input" placeholder="Archiv durchsuchen ..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <select className="select" value={folderId} onChange={(e) => { setFolderId(e.target.value); setPage(1); }}><option value="">Alle Ordner</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          <select className="select" value={topicId} onChange={(e) => { setTopicId(e.target.value); setPage(1); }}><option value="">Alle Themen</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select className="select" value={claimType} onChange={(e) => { setClaimType(e.target.value); setPage(1); }}><option value="">Alle Einordnungen</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="select" style={{ maxWidth: 220 }} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="newest">Neueste zuerst</option><option value="oldest">Älteste zuerst</option></select>
          <button className="button secondary" type="button" onClick={reset}>Filter zurücksetzen</button>
          <span className="small">{data.total} Beiträge</span>
        </div>
      </div>

      <h2 style={{ marginTop: 32 }}>Beiträge</h2>
      {loading ? <p>Lädt …</p> : <div className="grid">{data.posts.map((p) => <Link href={`/posts/${p.id}`} key={p.id}><article className="card"><h3>{p.title}</h3><p className="small">{p.event_date ? `Ereignis: ${p.event_date} · ` : ''}{p.folder_name} · {labels[p.claim_type] || p.claim_type}</p><p>{p.content.slice(0, 220)}{p.content.length > 220 ? ' …' : ''}</p><p className="small">Quellen: {p.sources.length} · Autor: {p.author_name}</p>{p.topics?.length > 0 && <p className="small">Themen: {p.topics.map((topic) => topic.name).join(', ')}</p>}</article></Link>)}</div>}
      {!loading && !data.posts.length && <p>Keine freigegebenen Beiträge gefunden.</p>}
      {data.pages > 1 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}><button className="button secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>← Zurück</button><span className="small">Seite {page} von {data.pages}</span><button className="button" disabled={page >= data.pages} onClick={() => setPage((value) => value + 1)}>Weiter →</button></div>}
    </main>
  </>;
}
