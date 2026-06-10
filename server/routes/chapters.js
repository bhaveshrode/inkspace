import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as booksModel from '../db/models/books.js';
import * as chaptersModel from '../db/models/chapters.js';
import * as notifications from '../db/models/notifications.js';
import * as interactionsModel from '../db/models/interactions.js';
import { getAuthorById } from '../db/models/authors.js';

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

    // Notify all followers about the new chapter
    const author = await getAuthorById(req.user.id);
    const followers = await interactionsModel.getAuthorFollowers(req.user.id);

    for (const follower of followers) {
      await notifications.createNotification({
        recipientId: follower.id,
        recipientType: 'reader',
        type: 'new_chapter',
        title: 'New Chapter Published',
        message: `${author.name} published a new chapter in "${b.title}"`,
        bookId: b.id,
        chapterId: chap.id,
        authorId: author.id
      });
    }

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
