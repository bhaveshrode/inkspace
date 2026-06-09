import express from 'express';
import { authenticateReader } from './readers.js';
import * as interactionsModel from '../db/models/interactions.js';
import * as ratingsModel from '../db/models/ratings.js';
import * as reviewsModel from '../db/models/reviews.js';
import * as commentsModel from '../db/models/comments.js';

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

// Reviews
router.get('/reviews/:bookId', async (req, res) => {
  try {
    const reviews = await reviewsModel.getReviewsByBookId(req.params.bookId);
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reviews/:bookId/user', authenticateReader, async (req, res) => {
  try {
    const review = await reviewsModel.getReviewByReaderAndBook(req.reader.id, req.params.bookId);
    res.json(review || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reviews', authenticateReader, async (req, res) => {
  try {
    const { bookId, rating, title, reviewText } = req.body;
    if (!bookId || !rating || !title || !reviewText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (title.length > 100) {
      return res.status(400).json({ error: 'Title must be 100 characters or less' });
    }
    if (reviewText.length < 50 || reviewText.length > 2000) {
      return res.status(400).json({ error: 'Review must be between 50 and 2000 characters' });
    }

    // Check if review already exists
    const existing = await reviewsModel.getReviewByReaderAndBook(req.reader.id, bookId);
    let review;
    if (existing) {
      review = await reviewsModel.updateReview(req.reader.id, bookId, { rating, title, reviewText });
    } else {
      review = await reviewsModel.createReview(req.reader.id, bookId, { rating, title, reviewText });
    }

    res.json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/reviews/:bookId', authenticateReader, async (req, res) => {
  try {
    const result = await reviewsModel.deleteReview(req.reader.id, req.params.bookId);
    res.json({ deleted: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reviews/:reviewId/helpful', authenticateReader, async (req, res) => {
  try {
    const result = await reviewsModel.incrementHelpfulCount(req.params.reviewId, req.reader.id);
    if (!result.success) {
      return res.status(409).json({ error: result.message, alreadyVoted: true });
    }
    res.json({ helpful_count: result.helpful_count, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reviews/:bookId/stats', async (req, res) => {
  try {
    const stats = await reviewsModel.getReviewStatsByBookId(req.params.bookId);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/reviews/:bookId/helpful-votes', authenticateReader, async (req, res) => {
  try {
    const votes = await reviewsModel.getReaderHelpfulVotes(req.reader.id, req.params.bookId);
    res.json({ votes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Comments
router.get('/comments/:bookId', async (req, res) => {
  try {
    const comments = await commentsModel.getCommentsByBookId(req.params.bookId);
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/comments', authenticateReader, async (req, res) => {
  try {
    const { bookId, text } = req.body;
    if (!bookId || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const comment = await commentsModel.addComment(bookId, {
      readerId: req.reader.id,
      text
    });
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/comments/:commentId', authenticateReader, async (req, res) => {
  try {
    const result = await commentsModel.deleteComment(req.params.commentId, req.reader.id);
    if (!result) {
      return res.status(403).json({ error: 'Cannot delete this comment' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
