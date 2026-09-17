require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, seed } = require('./db');
const mediaRouter = require('./media');
const archiveRouter = require('./archive');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'development-only-secret' || JWT_SECRET === 'replace-this-with-a-long-random-secret') {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET muss in Produktion gesetzt werden');
  console.warn('WARNUNG: Für Produktion einen langen eigenen JWT_SECRET setzen.');
}
seed();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map((x) => x.trim()) : true }));
app.use(express.json({ limit: '10mb' }));

const publicUser = (u) => ({ id: u.id, email: u.email, username: u.username, role: u.role, verified: Boolean(u.verified), createdAt: u.created_at });
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token fehlt' });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Token ungültig' }); }
};
const role = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Keine Berechtigung' });
const validUrl = (value) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
const claimTypes = ['fact', 'quote', 'summary', 'opinion', 'research', 'unverified'];
const postWithSources = (p) => ({ ...p, tags: JSON.parse(p.tags || '[]'), sources: db.prepare(`SELECT s.*, ps.relation_type FROM source_records s JOIN post_sources ps ON ps.source_id=s.id WHERE ps.post_id=?`).all(p.id) });

function bootstrapAdmin() {
  const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_USERNAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.startsWith('change-this')) return;
  if (!db.prepare('SELECT id FROM users WHERE email=?').get(ADMIN_EMAIL)) db.prepare(`INSERT INTO users (email, username, password_hash, role, verified) VALUES (?, ?, ?, 'admin', 1)`).run(ADMIN_EMAIL.trim().toLowerCase(), ADMIN_USERNAME.trim(), bcrypt.hashSync(ADMIN_PASSWORD, 12));
}
bootstrapAdmin();

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: 'sqlite' }));
app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  if (!email || !username || password.length < 8) return res.status(400).json({ error: 'Email, Username und Passwort (mindestens 8 Zeichen) erforderlich' });
  try { const result = db.prepare('INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)').run(email, username, await bcrypt.hash(password, 12)); res.status(201).json({ message: 'Registrierung erfolgreich. Admin muss verifizieren.', userId: result.lastInsertRowid }); }
  catch (e) { res.status(String(e.message).includes('UNIQUE') ? 409 : 500).json({ error: String(e.message).includes('UNIQUE') ? 'Email oder Username bereits vorhanden' : 'Registrierung fehlgeschlagen' }); }
});
app.post('/api/auth/login', async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(req.body.email || '').trim().toLowerCase());
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  if (!user.verified) return res.status(403).json({ error: 'Benutzer noch nicht verifiziert' });
  res.json({ token: jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '7d' }), user: publicUser(user) });
});
app.get('/api/users/me', auth, (req, res) => { const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id); u ? res.json(publicUser(u)) : res.status(404).json({ error: 'Benutzer nicht gefunden' }); });

app.get('/api/folders', (req, res) => res.json(db.prepare('SELECT * FROM folders ORDER BY name').all()));
app.post('/api/folders', auth, role('admin', 'moderator'), (req, res) => { if (!req.body.name?.trim()) return res.status(400).json({ error: 'Name erforderlich' }); const parentId = req.body.parentId ? Number(req.body.parentId) : null; if (parentId && !db.prepare('SELECT id FROM folders WHERE id=?').get(parentId)) return res.status(400).json({ error: 'Übergeordneter Ordner nicht gefunden' }); const r = db.prepare('INSERT INTO folders (name, description, parent_id) VALUES (?, ?, ?)').run(req.body.name.trim(), req.body.description || '', parentId); res.status(201).json(db.prepare('SELECT * FROM folders WHERE id=?').get(r.lastInsertRowid)); });

app.get('/api/sources', auth, (req, res) => res.json(db.prepare(`SELECT s.*, u.username AS creator_name FROM source_records s LEFT JOIN users u ON u.id=s.created_by WHERE s.created_by=? OR EXISTS (SELECT 1 FROM post_sources ps JOIN posts p ON p.id=ps.post_id WHERE ps.source_id=s.id AND p.status='approved') ORDER BY s.created_at DESC`).all(req.user.id)));
app.post('/api/sources', auth, (req, res) => {
  const { title = '', url, sourceType = 'article', license = 'unknown', attribution = '', notes = '' } = req.body;
  if (!url || !validUrl(url)) return res.status(400).json({ error: 'Eine gültige http(s)-URL ist erforderlich' });
  if (!['article', 'video', 'document', 'press_release', 'official', 'social', 'other'].includes(sourceType)) return res.status(400).json({ error: 'Ungültiger Quellentyp' });
  const r = db.prepare(`INSERT INTO source_records (title,url,source_type,license,attribution,notes,created_by) VALUES (?,?,?,?,?,?,?)`).run(String(title).trim(), String(url).trim(), sourceType, String(license).trim(), String(attribution).trim(), String(notes).trim(), req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM source_records WHERE id=?').get(r.lastInsertRowid));
});

app.use('/api/archive', (req, res, next) => { req.requireAuth = auth; req.requireRole = role; next(); }, archiveRouter);

app.post('/api/posts', auth, (req, res) => {
  const { title, content, folderId, tags = [], sourceIds = [], claimType = 'research', eventDate = null } = req.body;
  if (!title?.trim() || !content?.trim() || !folderId) return res.status(400).json({ error: 'Titel, Inhalt und Ordner erforderlich' });
  if (!claimTypes.includes(claimType)) return res.status(400).json({ error: 'Ungültige Einordnung' });
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return res.status(400).json({ error: 'Ereignisdatum muss JJJJ-MM-TT sein' });
  if (!Array.isArray(tags) || !Array.isArray(sourceIds) || !sourceIds.length) return res.status(400).json({ error: 'Mindestens eine Quelle ist erforderlich' });
  if (!db.prepare('SELECT id FROM folders WHERE id=?').get(folderId)) return res.status(400).json({ error: 'Ordner nicht gefunden' });
  const ids = [...new Set(sourceIds.map(Number))].filter(Number.isInteger); const marks = ids.map(() => '?').join(',');
  if (!marks) return res.status(400).json({ error: 'Mindestens eine Quelle ist erforderlich' });
  const existing = db.prepare(`SELECT id FROM source_records WHERE id IN (${marks})`).all(...ids).map((x) => x.id);
  if (existing.length !== ids.length) return res.status(400).json({ error: 'Quelle wurde nicht gefunden' });
  const create = db.transaction(() => { const r = db.prepare(`INSERT INTO posts (title,content,folder_id,tags,claim_type,event_date,author_id) VALUES (?,?,?,?,?,?,?)`).run(title.trim(), content.trim(), folderId, JSON.stringify(tags), claimType, eventDate || null, req.user.id); const add = db.prepare('INSERT INTO post_sources (post_id,source_id,relation_type) VALUES (?,?,?)'); existing.forEach((id) => add.run(r.lastInsertRowid, id, 'reference')); return r.lastInsertRowid; });
  res.status(201).json({ message: 'Beitrag mit Quellen zur Moderation eingereicht', id: create() });
});

app.use('/api/media', auth, mediaRouter);

app.get('/api/admin/users', auth, role('admin'), (req, res) => res.json(db.prepare('SELECT id,email,username,role,verified,created_at FROM users ORDER BY created_at DESC').all().map(publicUser)));
app.patch('/api/admin/users/:id/verify', auth, role('admin'), (req, res) => { const r = db.prepare('UPDATE users SET verified=1 WHERE id=?').run(req.params.id); r.changes ? res.json({ message: 'Benutzer verifiziert' }) : res.status(404).json({ error: 'Benutzer nicht gefunden' }); });
app.patch('/api/admin/users/:id/role', auth, role('admin'), (req, res) => { if (!['user', 'moderator', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'Ungültige Rolle' }); const r = db.prepare('UPDATE users SET role=? WHERE id=?').run(req.body.role, req.params.id); r.changes ? res.json({ message: 'Rolle aktualisiert' }) : res.status(404).json({ error: 'Benutzer nicht gefunden' }); });
app.get('/api/admin/posts/pending', auth, role('admin', 'moderator'), (req, res) => res.json(db.prepare(`SELECT p.*,u.username AS author_name,f.name AS folder_name FROM posts p JOIN users u ON u.id=p.author_id JOIN folders f ON f.id=p.folder_id WHERE p.status='pending' ORDER BY p.created_at`).all().map(postWithSources)));
app.patch('/api/admin/posts/:id/status', auth, role('admin', 'moderator'), (req, res) => {
  if (!['approved', 'rejected'].includes(req.body.status)) return res.status(400).json({ error: 'Status ungültig' });
  const post = db.prepare('SELECT status FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Beitrag nicht gefunden' });
  db.transaction(() => {
    db.prepare('UPDATE posts SET status=?,moderation_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.body.status, req.body.note || '', req.params.id);
    db.prepare('INSERT INTO moderation_logs (post_id,moderator_id,old_status,new_status,note) VALUES (?,?,?,?,?)').run(req.params.id, req.user.id, post.status, req.body.status, req.body.note || '');
  })();
  res.json({ message: 'Status aktualisiert' });
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Interner Serverfehler' }); });
app.listen(PORT, () => console.log(`Backend läuft auf http://localhost:${PORT}`));
