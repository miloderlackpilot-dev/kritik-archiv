require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

const users = [];
const folders = [
  { id: 1, name: 'Politik', description: 'Politische Ereignisse', parentId: null },
  { id: 2, name: 'Aussagen', description: 'Aussagen und Zitate', parentId: 1 },
  { id: 3, name: 'Vorfälle', description: 'Dokumentierte Vorfälle', parentId: 1 }
];
const posts = [];

app.use(cors());
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token fehlt' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token ungültig' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  next();
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, Username und Passwort erforderlich' });
  }

  const exists = users.some((user) => user.email === email || user.username === username);
  if (exists) {
    return res.status(400).json({ error: 'Benutzer bereits vorhanden' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: users.length + 1,
    email,
    username,
    role: 'user',
    verified: false,
    passwordHash
  };

  users.push(user);

  res.status(201).json({
    message: 'Registrierung erfolgreich. Admin muss verifizieren.',
    user: { id: user.id, email: user.email, username: user.username, role: user.role, verified: user.verified }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((entry) => entry.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
  }

  if (!user.verified) {
    return res.status(403).json({ error: 'Benutzer noch nicht verifiziert' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '7d'
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, username: user.username, role: user.role, verified: user.verified }
  });
});

app.get('/api/users/me', authMiddleware, (req, res) => {
  const user = users.find((entry) => entry.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  }

  res.json({ id: user.id, email: user.email, username: user.username, role: user.role, verified: user.verified });
});

app.get('/api/folders', (req, res) => {
  res.json(folders);
});

app.post('/api/folders', authMiddleware, requireRole('admin', 'moderator'), (req, res) => {
  const { name, description, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name erforderlich' });
  }

  const folder = {
    id: folders.length + 1,
    name,
    description: description || '',
    parentId: parentId || null
  };

  folders.push(folder);
  res.status(201).json(folder);
});

app.get('/api/posts', (req, res) => {
  res.json(posts.filter((post) => post.status === 'approved'));
});

app.post('/api/posts', authMiddleware, (req, res) => {
  const { title, content, folderId, tags = [] } = req.body;

  if (!title || !content || !folderId) {
    return res.status(400).json({ error: 'Titel, Inhalt und Ordner erforderlich' });
  }

  const post = {
    id: posts.length + 1,
    title,
    content,
    folderId,
    tags,
    authorId: req.user.id,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  posts.push(post);
  res.status(201).json({ message: 'Beitrag eingereicht', post });
});

app.get('/api/admin/users', authMiddleware, requireRole('admin'), (req, res) => {
  res.json(users.map((user) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    verified: user.verified
  })));
});

app.patch('/api/admin/users/:id/verify', authMiddleware, requireRole('admin'), (req, res) => {
  const user = users.find((entry) => entry.id === Number(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  }

  user.verified = true;
  res.json({ message: 'Benutzer verifiziert', user: { id: user.id, username: user.username, verified: user.verified } });
});

app.patch('/api/admin/users/:id/role', authMiddleware, requireRole('admin'), (req, res) => {
  const { role } = req.body;
  if (!['user', 'moderator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Ungültige Rolle' });
  }

  const user = users.find((entry) => entry.id === Number(req.params.id));
  if (!user) {
    return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  }

  user.role = role;
  res.json({ message: 'Rolle aktualisiert', user: { id: user.id, username: user.username, role: user.role } });
});

app.get('/api/admin/posts/pending', authMiddleware, requireRole('admin', 'moderator'), (req, res) => {
  res.json(posts.filter((post) => post.status === 'pending'));
});

app.patch('/api/admin/posts/:id/status', authMiddleware, requireRole('admin', 'moderator'), (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status ungültig' });
  }

  const post = posts.find((entry) => entry.id === Number(req.params.id));
  if (!post) {
    return res.status(404).json({ error: 'Beitrag nicht gefunden' });
  }

  post.status = status;
  res.json({ message: 'Status aktualisiert', post });
});

app.listen(PORT, () => {
  console.log(`Backend läuft auf http://localhost:${PORT}`);
});
