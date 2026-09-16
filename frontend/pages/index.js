import Link from 'next/link';
import axios from 'axios';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export default function HomePage() {
  const [posts, setPosts] = useState([]); const [folders, setFolders] = useState([]); const [query, setQuery] = useState('');
  useEffect(() => { Promise.all([axios.get(`${API}/api/posts`), axios.get(`${API}/api/folders`)]).then(([p, f]) => { setPosts(p.data); setFolders(f.data); }).catch(() => {}); }, []);
  const filtered = posts.filter((p) => `${p.title} ${p.content} ${p.author_name} ${p.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className="topbar"><div className="topbar-inner"><strong>Kritik-Archiv</strong><div className="nav"><Link href="/">Archiv</Link><Link href="/login">Login</Link><Link href="/register">Registrieren</Link><Link href="/dashboard">Dashboard</Link></div></div></div><main className="container"><h1>Öffentliches Kritik-Archiv</h1><p className="small">Freigegebene Beiträge mit nachvollziehbaren Originalquellen.</p><input className="input" placeholder="Archiv durchsuchen ..." value={query} onChange={(e) => setQuery(e.target.value)} /><h2 style={{ marginTop: 24 }}>Ordner</h2><div className="grid grid-3">{folders.map((f) => <div className="card" key={f.id}><h3>{f.name}</h3><p>{f.description}</p></div>)}</div><h2 style={{ marginTop: 32 }}>Beiträge</h2><div className="grid">{filtered.map((p) => <Link href={`/posts/${p.id}`} key={p.id}><article className="card"><h3>{p.title}</h3><p className="small">{p.event_date ? `Ereignis: ${p.event_date} · ` : ''}{p.folder_name} · Einordnung: {p.claim_type}</p><p>{p.content.slice(0, 220)}{p.content.length > 220 ? ' …' : ''}</p><p className="small">Quellen: {p.sources.length} · Autor: {p.author_name}</p></article></Link>)}</div>{!filtered.length && <p>Keine freigegebenen Beiträge gefunden.</p>}</main></>;
}
