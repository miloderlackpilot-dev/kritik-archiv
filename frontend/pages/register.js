import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      await axios.post('http://localhost:5000/api/auth/register', form);
      setMessage('Registrierung erfolgreich. Bitte warten, bis der Admin dich bestätigt.');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registrierung fehlgeschlagen');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 500 }}>
      <div className="card">
        <h2>Registrierung</h2>
        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        <form onSubmit={submit}>
          <div>
            <label>Email</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Username</label>
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Passwort</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="button" style={{ marginTop: 16, width: '100%' }} type="submit">Registrieren</button>
        </form>
        <p style={{ marginTop: 12 }} className="small">
          Bereits registriert? <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
