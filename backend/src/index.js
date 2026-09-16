require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, seed } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'replace-this-with-a-long-random-secret') {
  console.warn('WARNUNG: Bitte einen eigenen JWT_SECRET in .env setzen.');
}

seed();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const publicUser = (user) => ({
  id: user.id, email: user.email, username: user.username,
  role: user.role, verified: Boolean(user.verified), createdAt: user.created_at
});

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token fehlt' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Token ungültig' }); }
};

const role = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Keine Berechtigung' });
  next();
};

function bootstrapAdmin() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.startsWith('change-this')) return;
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (!exists) {
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
    db.prepare(`INSERT INTO users (email, username, password_hash, role, verified)
      VALUES (?, ?, ?, 'admin', 1)`).run(ADMIN_EMAIL, ADMIN_USERNAME, hash);
    console.log(`Admin-Account angelegt: ${ADMIN_USERNAME}`);
  }
}
bootstrapAdmin();

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'sqlite' }));

app.post('/api/auth/register', async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email, Username und Passwort (mindestens 8 Zeichen) erforderlich' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(`INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)`)
      .run(email.trim().toLowerCase(), username.trim(), hash);
    res.status(201).json({ message: 'Registrierung erfolgreich. Admin muss verifizieren.', userId: result.lastInsertRowid });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email oder Username bereits vorhanden' });
    res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(req.body.email || '').trim().toLowerCase());
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  }
  if (!user.verified) return res.status(403).json({ error: 'Benutzer noch nicht verifiziert' });
  const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: publicUser(user) });
});

app.get('/api/users/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  user ? res.json(publicUser(user)) : res.status(404).json({ error: 'Benutzer nicht gefunden' });
});

app.get('/api/folders', (req, res) => res.json(db.prepare('SELECT * FROM folders ORDER BY name').all()));
app.post('/api/folders', auth, role('admin', 'moderator'), (req, res) => {
  if (!req.body.name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });
  const result = db.prepare('INSERT INTO folders (name, description, parent_id) VALUES (?, ?, ?)')
    .run(req.body.name.trim(), req.body.description || '', req.body.parentId || null);
  res.status(201).json(db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid));
});

app.get('/api/posts', (req, res) => {
  const posts = db.prepare(`SELECT p.*, u.username AS author_name, f.name AS folder_name
    FROM posts p JOIN users u ON u.id = p.author_id JOIN folders f ON f.id = p.folder_id
    WHERE p.status = 'approved' ORDER BY p.created_at DESC`).all();
  res.json(posts.map((p) => ({ ...p, tags: JSON.parse(p.tags) })));
});
app.post('/api/posts', auth, (req, res) => {
  const { title, content, folderId, tags = [] } = req.body;
  if (!title?.trim() || !content?.trim() || !folderId) return res.status(400).json({ error: 'Titel, Inhalt und Ordner erforderlich' });
  const folder = db.prepare('SELECT id FROM folders WHERE id = ?').get(folderId);
  if (!folder) return res.status(400).json({ error: 'Ordner nicht gefunden' });
  const result = db.prepare(`INSERT INTO posts (title, content, folder_id, tags, author_id)
    VALUES (?, ?, ?, ?, ?)`).run(title.trim(), content.trim(), folderId, JSON.stringify(tags), req.user.id);
  res.status(201).json({ message: 'Beitrag zur Moderation eingereicht', id: result.lastInsertRowid });
});

app.get('/api/admin/users', auth, role('admin'), (req, res) => res.json(db.prepare('SELECT id,email,username,role,verified,created_at FROM users ORDER BY created_at DESC').all().map(publicUser)));
app.patch('/api/admin/users/:id/verify', auth, role('admin'), (req, res) => {
  const result = db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(req.params.id);
  result.changes ? res.json({ message: 'Benutzer verifiziert' }) : res.status(404).json({ error: 'Benutzer nicht gefunden' });
});
app.patch('/api/admin/users/:id/role', auth, role('admin'), (req, res) => {
  if (!['user', 'moderator', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'Ungültige Rolle' });
  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, req.params.id);
  result.changes ? res.json({ message: 'Rolle aktualisiert' }) : res.status(404).json({ error: 'Benutzer nicht gefunden' });
});
app.get('/api/admin/posts/pending', auth, role('admin', 'moderator'), (req, res) => res.json(db.prepare(`SELECT p.*, u.username AS author_name, f.name AS folder_name FROM posts p JOIN users u ON u.id=p.author_id JOIN folders f ON f.id=p.folder_id WHERE p.status='pending' ORDER BY p.created_at`).all()));
app.patch('/api/admin/posts/:id/status', auth, role('admin', 'moderator'), (req, res) => {
  if (!['approved', 'rejected'].includes(req.body.status)) return res.status(400).json({ error: 'Status ungültig' });
  const result = db.prepare('UPDATE posts SET status = ?, moderation_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.body.status, req.body.note || '', req.params.id);
  result.changes ? res.json({ message: 'Status aktualisiert' }) : res.status(404).json({ error: 'Beitrag nicht gefunden' });
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Interner Serverfehler' }); });
app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));
