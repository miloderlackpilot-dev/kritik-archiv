import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PostPage() {
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.query.id) return;
    axios.get(`${API}/api/posts/${router.query.id}`)
      .then((response) => {
        setPost(response.data);
        return axios.get(`${API}/api/media/post/${router.query.id}`);
      })
      .then((response) => setMedia(response.data))
      .catch((err) => setError(err.response?.data?.error || 'Beitrag konnte nicht geladen werden'));
  }, [router.query.id]);

  if (error) return <main className="container"><div className="alert error">{error}</div><Link href="/">← Zum Archiv</Link></main>;
  if (!post) return <main className="container"><p>Lädt …</p></main>;

  return <main className="container" style={{ maxWidth: 850 }}>
    <p><Link href="/">← Zum Archiv</Link></p>
    <article className="card">
      <h1>{post.title}</h1>
      <p className="small">
        {post.event_date ? `Ereignisdatum: ${post.event_date} · ` : ''}
        Einordnung: {post.claim_type} · Ordner: {post.folder_name} · Autor: {post.author_name}
      </p>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{post.content}</div>

      <h2 style={{ marginTop: 28 }}>Quellen</h2>
      {post.sources.map((source) => <div key={source.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}>
        <a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a>
        <div className="small">{source.source_type} · Lizenz: {source.license} · {source.attribution || 'Urheber nicht angegeben'}</div>
      </div>)}

      {media.length > 0 && <>
        <h2 style={{ marginTop: 28 }}>Dateien und Medien</h2>
        <div className="grid">
          {media.map((item) => <div className="card" key={item.id} style={{ padding: 12 }}>
            {item.mime_type.startsWith('image/') && <img src={`${API}/api/media/${item.id}/file`} alt={item.original_name} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} />}
            <p style={{ marginTop: 8 }}><a href={`${API}/api/media/${item.id}/file`} target="_blank" rel="noreferrer">{item.original_name}</a></p>
            <p className="small">Lizenz: {item.license} · Urheber: {item.attribution}</p>
            {item.source_url && <p className="small"><a href={item.source_url} target="_blank" rel="noreferrer">Originalquelle</a></p>}
          </div>)}
        </div>
      </>}
    </article>
  </main>;
}
