import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as interactionsModel from '../db/models/interactions.js';

const router = express.Router();

// Toggle follow
router.post('/follows', authenticate, async (req, res) => {
  try {
    const { authorId } = req.body;
    const followerId = req.user.id;
    if (!authorId) return res.status(400).json({ error: 'Missing fields' });
    const ok = await interactionsModel.toggleFollow(followerId, authorId);
    res.json({ following: ok });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle bookmark
router.post('/bookmarks', authenticate, async (req, res) => {
  try {
    const { bookId, chapterIndex } = req.body;
    const userId = req.user.id;
    if (!bookId) return res.status(400).json({ error: 'Missing fields' });
    const ok = await interactionsModel.toggleBookmark(userId, bookId, chapterIndex);
    res.json({ bookmarked: ok });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reading history
router.post('/reading', authenticate, async (req, res) => {
  try {
    const { bookId, chapterIndex } = req.body;
    const userId = req.user.id;
    if (!bookId) return res.status(400).json({ error: 'Missing fields' });
    await interactionsModel.addReading(userId, bookId, chapterIndex);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's following list
router.get('/users/:id/follows', authenticate, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(await interactionsModel.getUserFollowing(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's bookmarks
router.get('/users/:id/bookmarks', authenticate, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(await interactionsModel.getUserBookmarks(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's reading history
router.get('/users/:id/reading', authenticate, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    res.json(await interactionsModel.getUserReadingHistory(req.params.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
