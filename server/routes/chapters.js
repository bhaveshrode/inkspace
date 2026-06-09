import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as booksModel from '../db/models/books.js';
import * as chaptersModel from '../db/models/chapters.js';

const router = express.Router();

// Create new chapter
router.post('/:id/chapters', authenticate, async (req, res) => {
  try {
    const b = await booksModel.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Missing fields' });
    const chap = await chaptersModel.createChapter(req.params.id, { title, content });
    res.json(chap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update chapter
router.put('/:id/chapters/:idx', authenticate, async (req, res) => {
  try {
    const b = await booksModel.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { title, content } = req.body;
    const ok = await chaptersModel.updateChapter(req.params.id, parseInt(req.params.idx), { title, content });
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete chapter
router.delete('/:id/chapters/:idx', authenticate, async (req, res) => {
  try {
    const b = await booksModel.getBookById(req.params.id);
    if (!b) return res.status(404).json({ error: 'Book not found' });
    if (b.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const ok = await chaptersModel.deleteChapter(req.params.id, parseInt(req.params.idx));
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
