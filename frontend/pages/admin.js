import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/api/admin/users`, { headers }),
      axios.get(`${API}/api/admin/posts/pending`, { headers })
    ]).then(([usersResponse, postsResponse]) => {
      setUsers(usersResponse.data);
      setPending(postsResponse.data);
    }).catch((err) => setError(err.response?.data?.error || 'Adminbereich konnte nicht geladen werden'));
  }, [router]);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  const verify = async (id) => { await axios.patch(`${API}/api/admin/users/${id}/verify`, {}, { headers: headers() }); setUsers((items) => items.map((u) => u.id === id ? { ...u, verified: true } : u)); };
  const changeRole = async (id, role) => { await axios.patch(`${API}/api/admin/users/${id}/role`, { role }, { headers: headers() }); setUsers((items) => items.map((u) => u.id === id ? { ...u, role } : u)); };
  const moderate = async (id, status) => { await axios.patch(`${API}/api/admin/posts/${id}/status`, { status }, { headers: headers() }); setPending((items) => items.filter((p) => p.id !== id)); };

  return <main className="container">
    <p><Link href="/dashboard">← Dashboard</Link></p>
    <h1>Moderation und Verwaltung</h1>
    {error && <div className="alert error">{error}</div>}
    <section className="card">
      <h2>Offene Beiträge</h2>
      {!pending.length && <p className="small">Keine Beiträge warten auf Prüfung.</p>}
      {pending.map((post) => <article key={post.id} style={{ borderTop: '1px solid #e5e7eb', padding: '16px 0' }}>
        <h3>{post.title}</h3><p className="small">Von {post.author_name} · Ordner: {post.folder_name} · Einordnung: {post.claim_type} · Quellen: {post.sources.length}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
        <button className="button" onClick={() => moderate(post.id, 'approved')} style={{ marginRight: 8 }}>Freigeben</button>
        <button className="button danger" onClick={() => moderate(post.id, 'rejected')}>Ablehnen</button>
      </article>)}
    </section>
    <section className="card" style={{ marginTop: 20 }}>
      <h2>Nutzerverwaltung</h2>
      {users.map((user) => <div key={user.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}>
        <strong>{user.username}</strong> ({user.email}) <span className="small">· verifiziert: {user.verified ? 'Ja' : 'Nein'}</span><br />
        {!user.verified && <button className="button" onClick={() => verify(user.id)} style={{ margin: '8px 8px 0 0' }}>Verifizieren</button>}
        <select className="select" value={user.role} onChange={(e) => changeRole(user.id, e.target.value)} style={{ maxWidth: 180, display: 'inline-block' }}>
          <option value="user">Nutzer</option><option value="moderator">Moderator</option><option value="admin">Admin</option>
        </select>
      </div>)}
    </section>
  </main>;
}
