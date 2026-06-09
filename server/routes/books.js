import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';
import * as booksModel from '../db/models/books.js';

const router = express.Router();

// Get all books
router.get('/', async (req, res) => {
  try {
    const books = await booksModel.getBooks();
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new book
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, genre, series, tags, cover, description, status } = req.body;
    const authorId = req.user.id;
    if (!title) return res.status(400).json({ error: 'Missing fields' });
    const book = await booksModel.createBook({ authorId, title, genre, series, tags, cover, description, status });
    res.json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get book by ID
router.get('/:id', async (req, res) => {
  try {
    const b = await booksModel.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    res.json(b);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update book
router.put('/:id', authenticate, async (req, res) => {
  try {
    const b = await booksModel.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const updated = await booksModel.updateBook(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Book not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete book
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const b = await booksModel.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const ok = await booksModel.deleteBook(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Book not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for a book
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await booksModel.getComments(req.params.id);
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment to a book
router.post('/:id/comments', async (req, res) => {
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
    const c = await booksModel.addComment(req.params.id, { user, text });
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
