import express from 'express';
import { authenticateReader } from './readers.js';
import * as interactionsModel from '../db/models/interactions.js';
import * as ratingsModel from '../db/models/ratings.js';
import * as reviewsModel from '../db/models/reviews.js';
import * as commentsModel from '../db/models/comments.js';
import * as reviewRepliesModel from '../db/models/reviewReplies.js';
import * as commentRepliesModel from '../db/models/commentReplies.js';

const router = express.Router();

// Bookmarks
router.post('/bookmarks', authenticateReader, async (req, res) => {
  try {
    const { bookId, chapterIndex } = req.body;

    console.log('[POST /bookmarks] Request:', {
      bookId,
      chapterIndex,
      readerId: req.reader?.id
    });

    if (!bookId) return res.status(400).json({ error: 'Missing bookId' });

    const result = await interactionsModel.toggleBookmark(req.reader.id, bookId, chapterIndex);
    console.log('[POST /bookmarks] Success:', result);
    res.json({ bookmarked: result });
  } catch (err) {
    console.error('[POST /bookmarks] Error:', err.message);
    console.error('[POST /bookmarks] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
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

    console.log('[POST /history] Request:', {
      bookId,
      chapterIndex,
      readerId: req.reader?.id
    });

    if (!bookId) return res.status(400).json({ error: 'Missing bookId' });

    await interactionsModel.addReading(req.reader.id, bookId, chapterIndex);
    console.log('[POST /history] Success');
    res.json({ success: true });
  } catch (err) {
    console.error('[POST /history] Error:', err.message);
    console.error('[POST /history] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
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

    console.log('[POST /follow] Request:', {
      authorId,
      readerId: req.reader?.id
    });

    if (!authorId) return res.status(400).json({ error: 'Missing authorId' });

    const result = await interactionsModel.toggleFollow(req.reader.id, authorId);
    console.log('[POST /follow] Success:', result);
    res.json({ following: result });
  } catch (err) {
    console.error('[POST /follow] Error:', err.message);
    console.error('[POST /follow] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
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

    console.log('[POST /ratings] Request:', {
      bookId,
      rating,
      readerId: req.reader?.id
    });

    if (!bookId || !rating) return res.status(400).json({ error: 'Missing fields' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    const result = await ratingsModel.createOrUpdateRating(req.reader.id, bookId, rating);
    console.log('[POST /ratings] Success');
    res.json(result);
  } catch (err) {
    console.error('[POST /ratings] Error:', err.message);
    console.error('[POST /ratings] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
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

    console.log('[POST /reviews] Request:', {
      bookId,
      rating,
      titleLength: title?.length,
      reviewTextLength: reviewText?.length,
      readerId: req.reader?.id
    });

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
      console.log('[POST /reviews] Updating existing review:', existing.id);
      review = await reviewsModel.updateReview(req.reader.id, bookId, { rating, title, reviewText });
    } else {
      console.log('[POST /reviews] Creating new review');
      review = await reviewsModel.createReview(req.reader.id, bookId, { rating, title, reviewText });
    }

    console.log('[POST /reviews] Success:', review.id);
    res.json(review);
  } catch (err) {
    console.error('[POST /reviews] Error:', err.message);
    console.error('[POST /reviews] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
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
    console.log('[POST /reviews/:reviewId/helpful] Request:', {
      reviewId: req.params.reviewId,
      readerId: req.reader?.id
    });

    const result = await reviewsModel.incrementHelpfulCount(req.params.reviewId, req.reader.id);
    if (!result.success) {
      console.log('[POST /reviews/:reviewId/helpful] Already voted');
      return res.status(409).json({ error: result.message, alreadyVoted: true });
    }

    console.log('[POST /reviews/:reviewId/helpful] Success');
    res.json({ helpful_count: result.helpful_count, success: true });
  } catch (err) {
    console.error('[POST /reviews/:reviewId/helpful] Error:', err.message);
    console.error('[POST /reviews/:reviewId/helpful] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
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

    console.log('[POST /comments] Request:', {
      bookId,
      textLength: text?.length,
      readerId: req.reader?.id,
      hasReader: !!req.reader
    });

    if (!bookId || !text) {
      console.log('[POST /comments] Validation failed:', { bookId: !!bookId, text: !!text });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const comment = await commentsModel.addComment(bookId, {
      readerId: req.reader.id,
      text
    });

    console.log('[POST /comments] Success:', comment.id);
    res.json(comment);
  } catch (err) {
    console.error('[POST /comments] Error:', err.message);
    console.error('[POST /comments] Stack:', err.stack);
    console.error('[POST /comments] Full error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/comments/:commentId', authenticateReader, async (req, res) => {
  try {
    console.log('[DELETE /comments/:commentId] Request:', {
      commentId: req.params.commentId,
      readerId: req.reader?.id
    });

    const result = await commentsModel.deleteComment(req.params.commentId, req.reader.id);
    if (!result) {
      console.log('[DELETE /comments/:commentId] Forbidden - not owner');
      return res.status(403).json({ error: 'Cannot delete this comment' });
    }

    console.log('[DELETE /comments/:commentId] Success');
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /comments/:commentId] Error:', err.message);
    console.error('[DELETE /comments/:commentId] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Review Replies (Reader endpoints)
router.get('/reviews/:reviewId/replies', async (req, res) => {
  try {
    const replies = await reviewRepliesModel.getRepliesByReviewId(req.params.reviewId);
    res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reviews/:reviewId/replies', authenticateReader, async (req, res) => {
  try {
    const { text } = req.body;

    console.log('[POST /reviews/:reviewId/replies] Request:', {
      reviewId: req.params.reviewId,
      textLength: text?.length,
      readerId: req.reader?.id
    });

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
    }

    const reply = await reviewRepliesModel.addReply(
      req.params.reviewId,
      req.reader.id,
      'reader',
      text
    );

    console.log('[POST /reviews/:reviewId/replies] Success:', reply.id);
    res.json(reply);
  } catch (err) {
    console.error('[POST /reviews/:reviewId/replies] Error:', err.message);
    console.error('[POST /reviews/:reviewId/replies] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/reviews/:reviewId/replies/:replyId', authenticateReader, async (req, res) => {
  try {
    console.log('[DELETE /reviews/:reviewId/replies/:replyId] Request:', {
      replyId: req.params.replyId,
      readerId: req.reader?.id
    });

    const result = await reviewRepliesModel.deleteReply(
      req.params.replyId,
      req.reader.id,
      'reader'
    );

    if (!result) {
      console.log('[DELETE /reviews/:reviewId/replies/:replyId] Forbidden - not owner');
      return res.status(403).json({ error: 'Cannot delete this reply' });
    }

    console.log('[DELETE /reviews/:reviewId/replies/:replyId] Success');
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /reviews/:reviewId/replies/:replyId] Error:', err.message);
    console.error('[DELETE /reviews/:reviewId/replies/:replyId] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Comment Replies (Reader endpoints)
router.get('/comments/:commentId/replies', async (req, res) => {
  try {
    const replies = await commentRepliesModel.getRepliesByCommentId(req.params.commentId);
    res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/comments/:commentId/replies', authenticateReader, async (req, res) => {
  try {
    const { text } = req.body;

    console.log('[POST /comments/:commentId/replies] Request:', {
      commentId: req.params.commentId,
      textLength: text?.length,
      readerId: req.reader?.id
    });

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
    }

    const reply = await commentRepliesModel.addReply(
      req.params.commentId,
      req.reader.id,
      'reader',
      text
    );

    console.log('[POST /comments/:commentId/replies] Success:', reply.id);
    res.json(reply);
  } catch (err) {
    console.error('[POST /comments/:commentId/replies] Error:', err.message);
    console.error('[POST /comments/:commentId/replies] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/comments/:commentId/replies/:replyId', authenticateReader, async (req, res) => {
  try {
    console.log('[DELETE /comments/:commentId/replies/:replyId] Request:', {
      replyId: req.params.replyId,
      readerId: req.reader?.id
    });

    const result = await commentRepliesModel.deleteReply(
      req.params.replyId,
      req.reader.id,
      'reader'
    );

    if (!result) {
      console.log('[DELETE /comments/:commentId/replies/:replyId] Forbidden - not owner');
      return res.status(403).json({ error: 'Cannot delete this reply' });
    }

    console.log('[DELETE /comments/:commentId/replies/:replyId] Success');
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /comments/:commentId/replies/:replyId] Error:', err.message);
    console.error('[DELETE /comments/:commentId/replies/:replyId] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
