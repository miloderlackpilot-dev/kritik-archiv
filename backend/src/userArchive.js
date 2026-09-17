const express = require('express');
const { db } = require('./db');

const router = express.Router();
const attach = (post) => ({
  ...post,
  tags: JSON.parse(post.tags || '[]'),
  sources: db.prepare(`SELECT s.*, ps.relation_type FROM source_records s JOIN post_sources ps ON ps.source_id=s.id WHERE ps.post_id=?`).all(post.id),
  topics: db.prepare(`SELECT t.* FROM topics t JOIN post_topics pt ON pt.topic_id=t.id WHERE pt.post_id=? ORDER BY t.name`).all(post.id),
  persons: db.prepare(`SELECT p.* FROM persons p JOIN post_persons pp ON pp.person_id=p.id WHERE pp.post_id=? ORDER BY p.name`).all(post.id),
  organizations: db.prepare(`SELECT o.* FROM organizations o JOIN post_organizations po ON po.organization_id=o.id WHERE po.post_id=? ORDER BY o.name`).all(post.id)
});

router.get('/my-posts', req.requireAuth, (req, res) => {
  const rows = db.prepare(`SELECT p.*,u.username AS author_name,f.name AS folder_name FROM posts p JOIN users u ON u.id=p.author_id JOIN folders f ON f.id=p.folder_id WHERE p.author_id=? ORDER BY p.updated_at DESC, p.created_at DESC`).all(req.user.id);
  res.json(rows.map(attach));
});

router.get('/my-posts/:id', req.requireAuth, (req, res) => {
  const post = db.prepare(`SELECT p.*,u.username AS author_name,f.name AS folder_name FROM posts p JOIN users u ON u.id=p.author_id JOIN folders f ON f.id=p.folder_id WHERE p.id=? AND p.author_id=?`).get(req.params.id, req.user.id);
  post ? res.json(attach(post)) : res.status(404).json({ error: 'Beitrag nicht gefunden' });
});

module.exports = router;
