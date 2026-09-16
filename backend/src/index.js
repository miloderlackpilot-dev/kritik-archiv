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
  } catch {
    res.status(401).json({ error: 'Token ungültig' });
  }
};

const role = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Keine Berechtigung' });
  next();
};

const validUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
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
    const result = db.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)')
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

// Quellen: Es werden nur http(s)-Verweise und nachvollziehbare Lizenzangaben akzeptiert.
app.get('/api/sources', auth, (req, res) => {
  const rows = db.prepare(`SELECT s.*, u.username AS creator_name
    FROM source_records s LEFT JOIN users u ON u.id = s.created_by
    WHERE s.created_by = ? OR EXISTS (
      SELECT 1 FROM post_sources ps JOIN posts p ON p.id = ps.post_id
      WHERE ps.source_id = s.id AND p.status = 'approved'
    ) ORDER BY s.created_at DESC`).all(req.user.id);
  res.json(rows);
});

app.post('/api/sources', auth, (req, res) => {
  const { title = '', url, sourceType = 'article', license = 'unknown', attribution = '', notes = '' } = req.body;
  if (!url || !validUrl(url)) return res.status(400).json({ error: 'Eine gültige http(s)-URL ist erforderlich' });
  const allowedTypes = ['article', 'video', 'document', 'press_release', 'official', 'social', 'other'];
  if (!allowedTypes.includes(sourceType)) return res.status(400).json({ error: 'Ungültiger Quellentyp' });
  const result = db.prepare(`INSERT INTO source_records
    (title, url, source_type, license, attribution, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(title.trim(), url.trim(), sourceType, license.trim(), attribution.trim(), notes.trim(), req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM source_records WHERE id = ?').get(result.lastInsertRowid));
});

app.get('/api/posts', (req, res) => {
  const posts = db.prepare(`SELECT p.*, u.username AS author_name, f.name AS folder_name
    FROM posts p JOIN users u ON u.id = p.author_id JOIN folders f ON f.id = p.folder_id
    WHERE p.status = 'approved' ORDER BY p.created_at DESC`).all();
  res.json(posts.map((p) => ({
    ...p,
    tags: JSON.parse(p.tags),
    sources: db.prepare(`SELECT s.*, ps.relation_type FROM source_records s
      JOIN post_sources ps ON ps.source_id = s.id WHERE ps.post_id = ?`).all(p.id)
  })));
});

app.get('/api/posts/:id', (req, res) => {
  const post = db.prepare(`SELECT p.*, u.username AS author_name, f.name AS folder_name
    FROM posts p JOIN users u ON u.id = p.author_id JOIN folders f ON f.id = p.folder_id
    WHERE p.id = ? AND p.status = 'approved'`).get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Beitrag nicht gefunden' });
  post.tags = JSON.parse(post.tags);
  post.sources = db.prepare(`SELECT s.*, ps.relation_type FROM source_records s
    JOIN post_sources ps ON ps.source_id = s.id WHERE ps.post_id = ?`).all(post.id);
  res.json(post);
});

app.post('/api/posts', auth, (req, res) => {
  const { title, content, folderId, tags = [], sourceIds = [] } = req.body;
  if (!title?.trim() || !content?.trim() || !folderId) {
    return res.status(400).json({ error: 'Titel, Inhalt und Ordner erforderlich' });
  }
  if (!Array.isArray(tags) || !Array.isArray(sourceIds)) return res.status(400).json({ error: 'Tags und Quellen müssen Listen sein' });
  const folder = db.prepare('SELECT id FROM folders WHERE id = ?').get(folderId);
  if (!folder) return res.status(400).json({ error: 'Ordner nicht gefunden' });
  const uniqueSourceIds = [...new Set(sourceIds.map(Number))].filter(Number.isInteger);
  if (uniqueSourceIds.length === 0) return res.status(400).json({ error: 'Mindestens eine Quelle ist erforderlich' });
  const placeholders = uniqueSourceIds.map(() => '?').join(',');
  const existing = db.prepare(`SELECT id FROM source_records WHERE id IN (${placeholders})`).all(...uniqueSourceIds).map((s) => s.id);
  if (existing.length !== uniqueSourceIds.length) return res.status(400).json({ error: 'Mindestens eine Quelle wurde nicht gefunden' });

  const createPost = db.transaction(() => {
    const result = db.prepare(`INSERT INTO posts (title, content, folder_id, tags, author_id)
      VALUES (?, ?, ?, ?, ?)`).run(title.trim(), content.trim(), folderId, JSON.stringify(tags), req.user.id);
    const attach = db.prepare('INSERT INTO post_sources (post_id, source_id, relation_type) VALUES (?, ?, ?)');
    existing.forEach((sourceId) => attach.run(result.lastInsertRowid, sourceId, 'reference'));
    return result.lastInsertRowid;
  });
  const id = createPost();
  res.status(201).json({ message: 'Beitrag mit Quellen zur Moderation eingereicht', id });
});

app.get('/api/admin/users', auth, role('admin'), (req, res) => res.json(
  db.prepare('SELECT id,email,username,role,verified,created_at FROM users ORDER BY created_at DESC').all().map(publicUser)
));
app.patch('/api/admin/users/:id/verify', auth, role('admin'), (req, res) => {
  const result = db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(req.params.id);
  result.changes ? res.json({ message: 'Benutzer verifiziert' }) : res.status(404).json({ error: 'Benutzer nicht gefunden' });
});
app.patch('/api/admin/users/:id/role', auth, role('admin'), (req, res) => {
  if (!['user', 'moderator', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'Ungültige Rolle' });
  const result = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, req.params.id);
  result.changes ? res.json({ message: 'Rolle aktualisiert' }) : res.status(404).json({ error: 'Benutzer nicht gefunden' });
});
app.get('/api/admin/posts/pending', auth, role('admin', 'moderator'), (req, res) => res.json(
  db.prepare(`SELECT p.*, u.username AS author_name, f.name AS folder_name FROM posts p
    JOIN users u ON u.id = p.author_id JOIN folders f ON f.id = p.folder_id
    WHERE p.status = 'pending' ORDER BY p.created_at`).all().map((p) => ({
      ...p,
      tags: JSON.parse(p.tags),
      sources: db.prepare(`SELECT s.*, ps.relation_type FROM source_records s JOIN post_sources ps ON ps.source_id=s.id WHERE ps.post_id=?`).all(p.id)
    }))
));
app.patch('/api/admin/posts/:id/status', auth, role('admin', 'moderator'), (req, res) => {
  if (!['approved', 'rejected'].includes(req.body.status)) return res.status(400).json({ error: 'Status ungültig' });
  const result = db.prepare('UPDATE posts SET status = ?, moderation_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.body.status, req.body.note || '', req.params.id);
  result.changes ? res.json({ message: 'Status aktualisiert' }) : res.status(404).json({ error: 'Beitrag nicht gefunden' });
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Interner Serverfehler' }); });
app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));
