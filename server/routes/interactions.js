import express from 'express';
import { authenticateReader } from './readers.js';
import * as interactionsModel from '../db/models/interactions.js';
import * as ratingsModel from '../db/models/ratings.js';

const router = express.Router();

// Bookmarks
router.post('/bookmarks', authenticateReader, async (req, res) => {
  try {
    const { bookId, chapterIndex } = req.body;
    if (!bookId) return res.status(400).json({ error: 'Missing bookId' });
    const result = await interactionsModel.toggleBookmark(req.reader.id, bookId, chapterIndex);
    res.json({ bookmarked: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/bookmarks', authenticateReader, async (req, res) => {
  try {
    const bookmarks = await interactionsModel.getBookmarksWithDetails(req.reader.id);
    res.json(bookmarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reading History
router.post('/history', authenticateReader, async (req, res) => {
  try {
    const { bookId, chapterIndex } = req.body;
    if (!bookId) return res.status(400).json({ error: 'Missing bookId' });
    await interactionsModel.addReading(req.reader.id, bookId, chapterIndex);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history', authenticateReader, async (req, res) => {
  try {
    const history = await interactionsModel.getReadingHistoryWithDetails(req.reader.id);
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Follows
router.post('/follow/:authorId', authenticateReader, async (req, res) => {
  try {
    const { authorId } = req.params;
    if (!authorId) return res.status(400).json({ error: 'Missing authorId' });
    const result = await interactionsModel.toggleFollow(req.reader.id, authorId);
    res.json({ following: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/following', authenticateReader, async (req, res) => {
  try {
    const authors = await interactionsModel.getFollowedAuthorsWithDetails(req.reader.id);
    res.json(authors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/followers/:authorId', async (req, res) => {
  try {
    const count = await interactionsModel.getAuthorFollowerCount(req.params.authorId);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/is-following/:authorId', authenticateReader, async (req, res) => {
  try {
    const isFollowing = await interactionsModel.isFollowing(req.reader.id, req.params.authorId);
    res.json({ isFollowing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/has-bookmark/:bookId', authenticateReader, async (req, res) => {
  try {
    const bookmark = await interactionsModel.hasBookmark(req.reader.id, req.params.bookId);
    res.json({ hasBookmark: !!bookmark, chapterIndex: bookmark?.chapter_index });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Ratings
router.post('/ratings', authenticateReader, async (req, res) => {
  try {
    const { bookId, rating } = req.body;
    if (!bookId || !rating) return res.status(400).json({ error: 'Missing fields' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    const result = await ratingsModel.createOrUpdateRating(req.reader.id, bookId, rating);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/ratings/:bookId', authenticateReader, async (req, res) => {
  try {
    const rating = await ratingsModel.getUserRating(req.reader.id, req.params.bookId);
    res.json({ rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/ratings/:bookId', authenticateReader, async (req, res) => {
  try {
    const result = await ratingsModel.deleteRating(req.reader.id, req.params.bookId);
    res.json({ deleted: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
