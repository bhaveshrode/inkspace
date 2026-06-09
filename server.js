const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'inkspace-secret-key-for-dev-only';

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files from project root
app.use(express.static(path.join(__dirname)));

// JWT Authentication Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Authors
app.get('/api/authors', async (req, res) => {
  try {
    const authors = await db.getAuthors();
    res.json(authors);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/authors/:id', async (req, res) => {
  try {
    const a = await db.getAuthorById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Author not found' });
    res.json(a);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/authors', async (req, res) => {
  try {
    const { name, email, password, bio, avatar } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const exists = await db.getAuthorByEmail(email);
    if (exists) return res.status(409).json({ error: 'Email exists' });
    const newAuthor = await db.createAuthor({ name, email, password, bio, avatar });
    const token = jwt.sign({ id: newAuthor.id, email: newAuthor.email, name: newAuthor.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: newAuthor, token });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/authors/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await db.getAuthorByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = db.verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    // return user without password hash
    const { password_hash, ...safe } = user;
    const token = jwt.sign({ id: safe.id, email: safe.email, name: safe.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: safe, token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Books
app.get('/api/books', async (req, res) => {
  try {
    const books = await db.getBooks();
    res.json(books);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/books', authenticate, async (req, res) => {
  try {
    const { title, genre, series, tags, cover, description, status } = req.body;
    const authorId = req.user.id;
    if (!title) return res.status(400).json({ error: 'Missing fields' });
    const book = await db.createBook({ authorId, title, genre, series, tags, cover, description, status });
    res.json(book);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const b = await db.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    res.json(b);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/books/:id', authenticate, async (req, res) => {
  try {
    const b = await db.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    
    const updated = await db.updateBook(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Book not found' });
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/books/:id', authenticate, async (req, res) => {
  try {
    const b = await db.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const ok = await db.deleteBook(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Book not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Chapters
app.post('/api/books/:id/chapters', authenticate, async (req, res) => {
  try {
    const b = await db.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Missing fields' });
    const chap = await db.createChapter(req.params.id, { title, content });
    res.json(chap);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/books/:id/chapters/:idx', authenticate, async (req, res) => {
  try {
    const b = await db.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { title, content } = req.body;
    const ok = await db.updateChapter(req.params.id, parseInt(req.params.idx), { title, content });
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/books/:id/chapters/:idx', authenticate, async (req, res) => {
  try {
    const b = await db.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const ok = await db.deleteChapter(req.params.id, parseInt(req.params.idx));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Comments
app.get('/api/books/:id/comments', async (req, res) => {
  try {
    const comments = await db.getComments(req.params.id);
    res.json(comments);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/books/:id/comments', async (req, res) => {
  // Allow unauthenticated comments (as guest) or from token if passed
  try {
    let user = req.body.user || 'Guest';
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET);
        user = payload.name;
      } catch (e) {}
    }
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const c = await db.addComment(req.params.id, { user, text });
    res.json(c);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Follows
app.post('/api/follows', authenticate, async (req, res) => {
  try {
    const { authorId } = req.body;
    const followerId = req.user.id;
    if (!authorId) return res.status(400).json({ error: 'Missing fields' });
    const ok = await db.toggleFollow(followerId, authorId);
    res.json({ following: ok });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Bookmarks
app.post('/api/bookmarks', authenticate, async (req, res) => {
  try {
    const { bookId, chapterIndex } = req.body;
    const userId = req.user.id;
    if (!bookId) return res.status(400).json({ error: 'Missing fields' });
    const ok = await db.toggleBookmark(userId, bookId, chapterIndex);
    res.json({ bookmarked: ok });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Reading history
app.post('/api/reading', authenticate, async (req, res) => {
  try {
    const { bookId, chapterIndex } = req.body;
    const userId = req.user.id;
    if (!bookId) return res.status(400).json({ error: 'Missing fields' });
    await db.addReading(userId, bookId, chapterIndex);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// User data retrieval (protected)
app.get('/api/users/:id/follows', authenticate, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(await db.getUserFollowing(req.params.id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users/:id/bookmarks', authenticate, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(await db.getUserBookmarks(req.params.id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/users/:id/reading', authenticate, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(await db.getUserReadingHistory(req.params.id));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
