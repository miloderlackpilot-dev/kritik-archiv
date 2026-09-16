const express = require('express');
const { db } = require('./db');

const router = express.Router();

// Erweiterungen für die zweite Ausbaustufe des Archivs.
db.exec(`
  CREATE TABLE IF NOT EXISTS topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS post_topics (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, topic_id)
  );
  CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS post_persons (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, person_id)
  );
  CREATE TABLE IF NOT EXISTS post_organizations (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, organization_id)
  );
  CREATE TABLE IF NOT EXISTS post_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    folder_id INTEGER NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    claim_type TEXT NOT NULL,
    event_date TEXT,
    changed_by INTEGER NOT NULL REFERENCES users(id),
    change_reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS moderation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    moderator_id INTEGER NOT NULL REFERENCES users(id),
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES users(id),
    reason TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
    reviewed_by INTEGER REFERENCES users(id),
    review_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT
  );
`);

const topicSeed = [
  ['Innenpolitik', 'Politische Entwicklungen im Inland'],
  ['Außenpolitik', 'Internationale Politik und Beziehungen'],
  ['Wirtschaft', 'Wirtschafts- und Finanzpolitik'],
  ['Soziales', 'Sozialpolitik und gesellschaftliche Fragen'],
  ['Migration', 'Migration, Asyl und Integration'],
  ['Bildung', 'Schule, Ausbildung und Wissenschaft']
];
const insertTopic = db.prepare('INSERT OR IGNORE INTO topics (name, description) VALUES (?, ?)');
for (const topic of topicSeed) insertTopic.run(...topic);

const claimTypes = ['fact', 'quote', 'summary', 'opinion', 'research', 'unverified'];
const cleanIds = (value) => Array.isArray(value) ? [...new Set(value.map(Number).filter(Number.isInteger && Number.isSafeInteger))] : [];
const parseTags = (value) => Array.isArray(value) ? value.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 30) : [];
const validDate = (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);

function attach(post) {
  if (!post) return null;
  return {
    ...post,
    tags: JSON.parse(post.tags || '[]'),
    topics: db.prepare(`SELECT t.* FROM topics t JOIN post_topics pt ON pt.topic_id=t.id WHERE pt.post_id=? ORDER BY t.name`).all(post.id),
    persons: db.prepare(`SELECT p.* FROM persons p JOIN post_persons pp ON pp.person_id=p.id WHERE pp.post_id=? ORDER BY p.name`).all(post.id),
    organizations: db.prepare(`SELECT o.* FROM organizations o JOIN post_organizations po ON po.organization_id=o.id WHERE po.post_id=? ORDER BY o.name`).all(post.id),
    sources: db.prepare(`SELECT s.*, ps.relation_type FROM source_records s JOIN post_sources ps ON ps.source_id=s.id WHERE ps.post_id=?`).all(post.id)
  };
}

function canEditPost(post, user) {
  return post && (post.author_id === user.id || ['admin', 'moderator'].includes(user.role));
}
function upsertRelations(postId, topicIds, personIds, organizationIds) {
  const addTopic = db.prepare('INSERT OR IGNORE INTO post_topics (post_id, topic_id) VALUES (?, ?)');
  const addPerson = db.prepare('INSERT OR IGNORE INTO post_persons (post_id, person_id) VALUES (?, ?)');
  const addOrganization = db.prepare('INSERT OR IGNORE INTO post_organizations (post_id, organization_id) VALUES (?, ?)');
  topicIds.forEach((id) => addTopic.run(postId, id));
  personIds.forEach((id) => addPerson.run(postId, id));
  organizationIds.forEach((id) => addOrganization.run(postId, id));
}

router.get('/topics', (req, res) => res.json(db.prepare('SELECT * FROM topics ORDER BY name').all()));
router.post('/topics', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  try {
    const result = db.prepare('INSERT INTO topics (name, description) VALUES (?, ?)').run(name, String(req.body.description || '').trim());
    res.status(201).json(db.prepare('SELECT * FROM topics WHERE id=?').get(result.lastInsertRowid));
  } catch { res.status(409).json({ error: 'Thema existiert bereits' }); }
});

router.get('/persons', (req, res) => res.json(db.prepare('SELECT * FROM persons ORDER BY name').all()));
router.post('/persons', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  try {
    const result = db.prepare('INSERT INTO persons (name, description) VALUES (?, ?)').run(name, String(req.body.description || '').trim());
    res.status(201).json(db.prepare('SELECT * FROM persons WHERE id=?').get(result.lastInsertRowid));
  } catch { res.status(409).json({ error: 'Person existiert bereits' }); }
});

router.get('/organizations', (req, res) => res.json(db.prepare('SELECT * FROM organizations ORDER BY name').all()));
router.post('/organizations', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  try {
    const result = db.prepare('INSERT INTO organizations (name, description) VALUES (?, ?)').run(name, String(req.body.description || '').trim());
    res.status(201).json(db.prepare('SELECT * FROM organizations WHERE id=?').get(result.lastInsertRowid));
  } catch { res.status(409).json({ error: 'Organisation existiert bereits' }); }
});

router.get('/posts', (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const offset = (page - 1) * limit;
  const where = ['p.status = \'approved\''];
  const params = [];
  if (req.query.q) {
    where.push(`(LOWER(p.title) LIKE ? OR LOWER(p.content) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(p.tags) LIKE ?)`);
    const q = `%${String(req.query.q).toLowerCase()}%`;
    params.push(q, q, q, q);
  }
  if (req.query.folderId) { where.push('p.folder_id=?'); params.push(Number(req.query.folderId)); }
  if (req.query.claimType && claimTypes.includes(req.query.claimType)) { where.push('p.claim_type=?'); params.push(req.query.claimType); }
  if (req.query.dateFrom && validDate(req.query.dateFrom)) { where.push('COALESCE(p.event_date, substr(p.created_at,1,10)) >= ?'); params.push(req.query.dateFrom); }
  if (req.query.dateTo && validDate(req.query.dateTo)) { where.push('COALESCE(p.event_date, substr(p.created_at,1,10)) <= ?'); params.push(req.query.dateTo); }
  if (req.query.topicId) { where.push('EXISTS (SELECT 1 FROM post_topics pt WHERE pt.post_id=p.id AND pt.topic_id=?)'); params.push(Number(req.query.topicId)); }
  const order = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
  const count = db.prepare(`SELECT COUNT(*) AS count FROM posts p JOIN users u ON u.id=p.author_id WHERE ${where.join(' AND ')}`).get(...params).count;
  const rows = db.prepare(`SELECT p.*, u.username AS author_name, f.name AS folder_name FROM posts p JOIN users u ON u.id=p.author_id JOIN folders f ON f.id=p.folder_id WHERE ${where.join(' AND ')} ORDER BY COALESCE(p.event_date,p.created_at) ${order} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json({ page, limit, total: count, pages: Math.ceil(count / limit), posts: rows.map(attach) });
});

router.patch('/posts/:id', req.requireAuth, async (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!canEditPost(post, req.user)) return res.status(403).json({ error: 'Beitrag darf nicht bearbeitet werden' });
  const title = String(req.body.title || post.title).trim();
  const content = String(req.body.content || post.content).trim();
  const folderId = Number(req.body.folderId || post.folder_id);
  const claimType = req.body.claimType || post.claim_type;
  const eventDate = req.body.eventDate === undefined ? post.event_date : req.body.eventDate || null;
  const tags = req.body.tags === undefined ? JSON.parse(post.tags || '[]') : parseTags(req.body.tags);
  if (!title || !content || !db.prepare('SELECT id FROM folders WHERE id=?').get(folderId)) return res.status(400).json({ error: 'Titel, Inhalt und gültiger Ordner erforderlich' });
  if (!claimTypes.includes(claimType) || !validDate(eventDate)) return res.status(400).json({ error: 'Einordnung oder Ereignisdatum ungültig' });
  const reason = String(req.body.changeReason || '').trim();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO post_versions (post_id,title,content,folder_id,tags,claim_type,event_date,changed_by,change_reason) VALUES (?,?,?,?,?,?,?,?,?)`).run(post.id, post.title, post.content, post.folder_id, post.tags, post.claim_type, post.event_date, req.user.id, reason);
    db.prepare(`UPDATE posts SET title=?,content=?,folder_id=?,tags=?,claim_type=?,event_date=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(title, content, folderId, JSON.stringify(tags), claimType, eventDate, req.user.role === 'user' ? 'pending' : post.status, post.id);
  });
  tx();
  res.json(attach(db.prepare(`SELECT p.*,u.username AS author_name,f.name AS folder_name FROM posts p JOIN users u ON u.id=p.author_id JOIN folders f ON f.id=p.folder_id WHERE p.id=?`).get(post.id)));
});

router.get('/posts/:id/versions', req.requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post || !canEditPost(post, req.user)) return res.status(403).json({ error: 'Keine Berechtigung' });
  res.json(db.prepare(`SELECT v.*,u.username AS changed_by_name FROM post_versions v JOIN users u ON u.id=v.changed_by WHERE v.post_id=? ORDER BY v.created_at DESC`).all(post.id));
});

router.post('/posts/:id/report', req.requireAuth, (req, res) => {
  const post = db.prepare('SELECT id,status FROM posts WHERE id=?').get(req.params.id);
  if (!post || post.status !== 'approved') return res.status(404).json({ error: 'Beitrag nicht gefunden' });
  const reason = String(req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'Grund erforderlich' });
  const recent = db.prepare(`SELECT id FROM reports WHERE post_id=? AND reporter_id=? AND created_at >= datetime('now','-1 day') AND status='open'`).get(post.id, req.user.id);
  if (recent) return res.status(409).json({ error: 'Du hast diesen Beitrag bereits gemeldet' });
  const result = db.prepare('INSERT INTO reports (post_id,reporter_id,reason,details) VALUES (?,?,?,?)').run(post.id, req.user.id, reason, String(req.body.details || '').trim());
  res.status(201).json({ id: result.lastInsertRowid, message: 'Meldung eingereicht' });
});

router.get('/admin/reports', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => res.json(db.prepare(`SELECT r.*,p.title,u.username AS reporter_name FROM reports r JOIN posts p ON p.id=r.post_id LEFT JOIN users u ON u.id=r.reporter_id ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC`).all()));
router.patch('/admin/reports/:id', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const status = String(req.body.status || 'reviewed');
  if (!['reviewed', 'dismissed', 'open'].includes(status)) return res.status(400).json({ error: 'Status ungültig' });
  const result = db.prepare(`UPDATE reports SET status=?,reviewed_by=?,review_note=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?`).run(status, req.user.id, String(req.body.note || '').trim(), req.params.id);
  result.changes ? res.json({ message: 'Meldung aktualisiert' }) : res.status(404).json({ error: 'Meldung nicht gefunden' });
});

router.get('/admin/moderation/:postId', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => res.json(db.prepare(`SELECT m.*,u.username AS moderator_name FROM moderation_logs m JOIN users u ON u.id=m.moderator_id WHERE m.post_id=? ORDER BY m.created_at DESC`).all(req.params.postId)));

module.exports = router;