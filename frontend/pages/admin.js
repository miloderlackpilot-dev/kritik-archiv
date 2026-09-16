import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const router = useRouter();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    axios.get('http://localhost:5000/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUsers(res.data))
      .catch(() => router.push('/login'));
  }, [router, token]);

  const verify = async (id) => {
    await axios.patch(`http://localhost:5000/api/admin/users/${id}/verify`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setUsers((prev) => prev.map((user) => user.id === id ? { ...user, verified: true } : user));
  };

  const changeRole = async (id, role) => {
    await axios.patch(`http://localhost:5000/api/admin/users/${id}/role`, { role }, { headers: { Authorization: `Bearer ${token}` } });
    setUsers((prev) => prev.map((user) => user.id === id ? { ...user, role } : user));
  };

  return (
    <div className="container">
      <h1>Admin-Bereich</h1>
      <div className="card">
        <h3>Benutzer verwalten</h3>
        {users.map((user) => (
          <div key={user.id} style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 12 }}>
            <p><strong>{user.username}</strong> ({user.email})</p>
            <p className="small">Rolle: {user.role} | Verifiziert: {user.verified ? 'Ja' : 'Nein'}</p>
            {!user.verified && <button className="button" onClick={() => verify(user.id)} style={{ marginRight: 8 }}>Verifizieren</button>}
            <select className="select" defaultValue={user.role} onChange={(e) => changeRole(user.id, e.target.value)} style={{ maxWidth: 180, display: 'inline-block', marginTop: 8 }}>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
