import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login fehlgeschlagen');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 500 }}>
      <div className="card">
        <h2>Login</h2>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <div>
            <label>Email</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label>Passwort</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="button" style={{ marginTop: 16, width: '100%' }} type="submit">Einloggen</button>
        </form>
        <p style={{ marginTop: 12 }} className="small">
          Noch kein Konto? <Link href="/register">Registrieren</Link>
        </p>
      </div>
    </div>
  );
}
