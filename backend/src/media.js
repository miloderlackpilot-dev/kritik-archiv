const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('./db');

const router = express.Router();
const mediaDir = path.join(__dirname, '..', 'data', 'media');
fs.mkdirSync(mediaDir, { recursive: true });
const allowed = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['application/pdf', '.pdf']
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: mediaDir,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${allowed.get(file.mimetype) || '.bin'}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, allowed.has(file.mimetype))
});

function matchesSignature(filePath, mimeType) {
  const handle = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(16);
  try {
    fs.readSync(handle, header, 0, header.length, 0);
  } finally {
    fs.closeSync(handle);
  }
  if (mimeType === 'image/jpeg') return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (mimeType === 'image/png') return header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/webp') return header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP';
  if (mimeType === 'application/pdf') return header.subarray(0, 5).toString() === '%PDF-';
  return false;
}

function removeUpload(file) {
  if (file?.path) fs.rmSync(file.path, { force: true });
}
function canUsePost(post, user) {
  return post && (post.author_id === user.id || ['admin', 'moderator'].includes(user.role));
}

router.post('/', (req, res, next) => upload.single('file')(req, res, (error) => {
  if (error) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Datei darf höchstens 10 MB groß sein' : 'Nur JPG, PNG, WebP oder PDF erlaubt' });
  next();
}), (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Nur JPG, PNG, WebP oder PDF bis 10 MB erlaubt' });
  const { postId, license, attribution, sourceUrl = '' } = req.body;
  const post = db.prepare('SELECT id, author_id FROM posts WHERE id = ?').get(postId);
  if (!post || !canUsePost(post, req.user)) {
    removeUpload(req.file);
    return res.status(403).json({ error: 'Datei darf diesem Beitrag nicht hinzugefügt werden' });
  }
  if (!license?.trim() || !attribution?.trim() || (sourceUrl && !/^https?:\/\//i.test(sourceUrl))) {
    removeUpload(req.file);
    return res.status(400).json({ error: 'Lizenz und Urheber/Namensnennung sind Pflichtfelder; Quelle muss http(s) sein' });
  }
  if (!matchesSignature(req.file.path, req.file.mimetype)) {
    removeUpload(req.file);
    return res.status(400).json({ error: 'Der tatsächliche Dateiinhalt passt nicht zum angegebenen Dateityp' });
  }
  try {
    const result = db.prepare(`INSERT INTO media (post_id, stored_name, original_name, mime_type, size_bytes, license, attribution, source_url, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(post.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, license.trim(), attribution.trim(), sourceUrl.trim(), req.user.id);
    res.status(201).json(db.prepare(`SELECT id, post_id, original_name, mime_type, size_bytes, license, attribution, source_url, created_at
      FROM media WHERE id = ?`).get(result.lastInsertRowid));
  } catch (error) {
    removeUpload(req.file);
    next(error);
  }
});

router.get('/:id/file', (req, res) => {
  const media = db.prepare(`SELECT m.*, p.status FROM media m JOIN posts p ON p.id = m.post_id WHERE m.id = ?`).get(req.params.id);
  if (!media || media.status !== 'approved') return res.status(404).json({ error: 'Datei nicht verfügbar' });
  const filePath = path.join(mediaDir, media.stored_name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });
  res.type(media.mime_type).sendFile(filePath);
});

router.get('/post/:postId', (req, res) => {
  const post = db.prepare('SELECT status FROM posts WHERE id = ?').get(req.params.postId);
  if (!post || post.status !== 'approved') return res.status(404).json({ error: 'Dateien nicht verfügbar' });
  res.json(db.prepare(`SELECT id, post_id, original_name, mime_type, size_bytes, license, attribution, source_url, created_at
    FROM media WHERE post_id = ? ORDER BY created_at`).all(req.params.postId));
});

module.exports = router;
