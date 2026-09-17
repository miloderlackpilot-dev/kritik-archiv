const express = require('express');
const { db } = require('./db');
const router = express.Router();

router.get('/admin/folders', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const rows = db.prepare(`SELECT f.*, COUNT(DISTINCT p.id) AS post_count FROM folders f LEFT JOIN posts p ON p.folder_id=f.id GROUP BY f.id ORDER BY f.parent_id IS NOT NULL, f.name`).all();
  res.json(rows);
});

router.post('/admin/folders', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  const parentId = req.body.parentId ? Number(req.body.parentId) : null;
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  if (parentId !== null && (!Number.isInteger(parentId) || !db.prepare('SELECT id FROM folders WHERE id=?').get(parentId))) return res.status(400).json({ error: 'Übergeordneter Ordner nicht gefunden' });
  try {
    const r = db.prepare('INSERT INTO folders (name,description,parent_id) VALUES (?,?,?)').run(name, description, parentId);
    res.status(201).json(db.prepare('SELECT * FROM folders WHERE id=?').get(r.lastInsertRowid));
  } catch (e) { res.status(409).json({ error: 'Ordner konnte nicht angelegt werden' }); }
});

router.patch('/admin/folders/:id', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM folders WHERE id=?').get(id);
  if (!current) return res.status(404).json({ error: 'Ordner nicht gefunden' });
  const name = String(req.body.name ?? current.name).trim();
  const description = String(req.body.description ?? current.description).trim();
  const parentId = req.body.parentId === null || req.body.parentId === '' ? null : Number(req.body.parentId ?? current.parent_id);
  if (!name) return res.status(400).json({ error: 'Name erforderlich' });
  if (parentId === id) return res.status(400).json({ error: 'Ein Ordner kann nicht sein eigener übergeordneter Ordner sein' });
  if (parentId !== null && (!Number.isInteger(parentId) || !db.prepare('SELECT id FROM folders WHERE id=?').get(parentId))) return res.status(400).json({ error: 'Übergeordneter Ordner nicht gefunden' });
  if (parentId !== null) {
    let cursor = parentId;
    while (cursor !== null) {
      if (cursor === id) return res.status(400).json({ error: 'Zyklische Ordnerstruktur nicht erlaubt' });
      const row = db.prepare('SELECT parent_id FROM folders WHERE id=?').get(cursor);
      cursor = row ? row.parent_id : null;
    }
  }
  db.prepare('UPDATE folders SET name=?,description=?,parent_id=? WHERE id=?').run(name, description, parentId, id);
  res.json(db.prepare('SELECT * FROM folders WHERE id=?').get(id));
});

router.delete('/admin/folders/:id', req.requireAuth, req.requireRole('admin', 'moderator'), (req, res) => {
  const id = Number(req.params.id);
  const folder = db.prepare('SELECT id FROM folders WHERE id=?').get(id);
  if (!folder) return res.status(404).json({ error: 'Ordner nicht gefunden' });
  const posts = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE folder_id=?').get(id).count;
  const children = db.prepare('SELECT COUNT(*) AS count FROM folders WHERE parent_id=?').get(id).count;
  if (posts > 0) return res.status(409).json({ error: `Ordner enthält ${posts} Beitrag/Beiträge. Beiträge zuerst verschieben.` });
  if (children > 0) return res.status(409).json({ error: `Ordner enthält ${children} Unterordner. Unterordner zuerst verschieben oder löschen.` });
  db.prepare('DELETE FROM folders WHERE id=?').run(id);
  res.json({ message: 'Ordner gelöscht' });
});

module.exports = router;
