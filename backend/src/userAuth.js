const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const token = () => crypto.randomBytes(32).toString('hex');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const baseUrl = () => process.env.FRONTEND_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';

function sendLink(kind, email, link) {
  if (process.env.NODE_ENV !== 'production' || !process.env.SMTP_HOST) {
    console.log(`[${kind}] ${email}: ${link}`);
    return;
  }
  console.warn(`SMTP ist konfiguriert, aber kein Mail-Provider ist implementiert. Link für ${email}: ${link}`);
}

function router({ auth }) {
  const express = require('express');
  const router = express.Router();
  router.post('/request-password-reset', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = db.prepare('SELECT id,email FROM users WHERE email=?').get(email);
    if (user) {
      const raw = token();
      db.prepare("UPDATE password_resets SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND used_at IS NULL").run(user.id);
      db.prepare("INSERT INTO password_resets (user_id,token_hash,expires_at) VALUES (?,?,datetime('now','+30 minutes'))").run(user.id, hash(raw));
      sendLink('PASSWORT-RESET', user.email, `${baseUrl()}/reset-password?token=${raw}`);
    }
    res.json({ message: 'Wenn die E-Mail existiert, wurde ein Link zum Zurücksetzen erstellt.' });
  });
  router.post('/reset-password', async (req, res) => {
    const raw = String(req.body.token || '');
    const password = String(req.body.password || '');
    if (!raw || password.length < 8) return res.status(400).json({ error: 'Token und Passwort mit mindestens 8 Zeichen erforderlich' });
    const record = db.prepare("SELECT * FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP").get(hash(raw));
    if (!record) return res.status(400).json({ error: 'Reset-Link ist ungültig oder abgelaufen' });
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password, 12), record.user_id);
      db.prepare('UPDATE password_resets SET used_at=CURRENT_TIMESTAMP WHERE id=?').run(record.id);
    })();
    res.json({ message: 'Passwort wurde geändert. Du kannst dich jetzt anmelden.' });
  });
  router.post('/resend-verification', auth, (req, res) => {
    const user = db.prepare('SELECT id,email,verified FROM users WHERE id=?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    if (user.verified) return res.json({ message: 'E-Mail ist bereits verifiziert' });
    const raw = token();
    db.prepare("UPDATE email_verifications SET used_at=CURRENT_TIMESTAMP WHERE user_id=? AND used_at IS NULL").run(user.id);
    db.prepare("INSERT INTO email_verifications (user_id,token_hash,expires_at) VALUES (?,?,datetime('now','+24 hours'))").run(user.id, hash(raw));
    sendLink('E-MAIL-VERIFIZIERUNG', user.email, `${baseUrl()}/verify-email?token=${raw}`);
    res.json({ message: 'Verifizierungslink wurde erstellt.' });
  });
  router.post('/verify-email', (req, res) => {
    const raw = String(req.body.token || '');
    const record = db.prepare("SELECT * FROM email_verifications WHERE token_hash=? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP").get(hash(raw));
    if (!record) return res.status(400).json({ error: 'Verifizierungslink ist ungültig oder abgelaufen' });
    db.transaction(() => {
      db.prepare('UPDATE users SET verified=1 WHERE id=?').run(record.user_id);
      db.prepare('UPDATE email_verifications SET used_at=CURRENT_TIMESTAMP WHERE id=?').run(record.id);
    })();
    res.json({ message: 'E-Mail wurde verifiziert.' });
  });
  return router;
}
module.exports = router;