import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';
import * as booksModel from '../db/models/books.js';
import * as ratingsModel from '../db/models/ratings.js';
import * as reviewsModel from '../db/models/reviews.js';
import * as commentsModel from '../db/models/comments.js';
import * as reviewRepliesModel from '../db/models/reviewReplies.js';
import * as commentRepliesModel from '../db/models/commentReplies.js';
import { getAuthorById } from '../db/models/authors.js';
import { createNotification } from '../db/models/notifications.js';
import { getReaderById } from '../db/models/readers.js';

const router = express.Router();

// Search endpoint - Search books with filters and sorting
router.get('/search', async (req, res) => {
  try {
    const { q, genre, status, minRating, sortBy, limit, offset } = req.query;

    const searchOptions = {
      query: q || '',
      genre: genre || '',
      status: status || '',
      minRating: minRating ? parseFloat(minRating) : 0,
      sortBy: sortBy || 'relevance',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    const [results, total] = await Promise.all([
      booksModel.searchBooks(searchOptions),
      booksModel.getSearchCount(searchOptions)
    ]);

    res.json({
      results,
      total,
      page: Math.floor(searchOptions.offset / searchOptions.limit) + 1,
      totalPages: Math.ceil(total / searchOptions.limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Discovery endpoint - Trending this week (most views in last 7 days)
router.get('/discover/trending', async (req, res) => {
  try {
    const books = await booksModel.getTrendingBooks(7, 20);
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Discovery endpoint - Highest rated (avg rating >= 4.5, min 5 ratings)
router.get('/discover/highest-rated', async (req, res) => {
  try {
    const books = await booksModel.getHighestRatedBooks(20);
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Discovery endpoint - Recently updated (new chapters in last 30 days)
router.get('/discover/recently-updated', async (req, res) => {
  try {
    const books = await booksModel.getRecentlyUpdatedBooks(30, 20);
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Discovery endpoint - Completed stories
router.get('/discover/completed', async (req, res) => {
  try {
    const books = await booksModel.getCompletedBooks(20);
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all books (with optional filtering and sorting)
router.get('/', async (req, res) => {
  try {
    const { status, minRating, sortBy, limit } = req.query;
    const books = await booksModel.getBooks({ status, minRating, sortBy, limit });
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
    const ratingData = await ratingsModel.getAverageRating(req.params.id);
    res.json({ ...b, averageRating: ratingData.average, ratingCount: ratingData.count });
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
  try {
    let readerId = null;
    let user = req.body.user || 'Guest';

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(req.headers.authorization.split(' ')[1], JWT_SECRET);
        readerId = payload.id;
        user = payload.name;
      } catch (e) {}
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const c = await booksModel.addComment(req.params.id, { readerId, user, text });
    res.json(c);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get average rating for a book
router.get('/:id/ratings', async (req, res) => {
  try {
    const ratingData = await ratingsModel.getAverageRating(req.params.id);
    res.json(ratingData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detailed ratings for a book (protected - author only)
router.get('/:id/ratings/detailed', authenticate, async (req, res) => {
  try {
    const book = await booksModel.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const breakdown = await ratingsModel.getRatingsBreakdownByBookId(req.params.id);
    const detailed = await ratingsModel.getRatingsWithReaderDetails(req.params.id);

    res.json({ breakdown, detailed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detailed reviews for a book (protected - author only)
router.get('/:id/reviews/detailed', authenticate, async (req, res) => {
  try {
    const book = await booksModel.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const reviews = await reviewsModel.getReviewsByBookId(req.params.id);
    const stats = await reviewsModel.getReviewStatsByBookId(req.params.id);

    res.json({ reviews, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get comments for a book (author-specific - protected)
router.get('/:id/comments/detailed', authenticate, async (req, res) => {
  try {
    const book = await booksModel.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const comments = await commentsModel.getCommentsByBookId(req.params.id);
    const count = await commentsModel.getCommentCountByBookId(req.params.id);

    res.json({ comments, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reply to a review (author only)
router.post('/:id/reviews/:reviewId/reply', authenticate, async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText || replyText.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    if (replyText.length > 2000) {
      return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
    }

    const review = await reviewsModel.replyToReview(req.user.id, req.params.reviewId, replyText);
    res.json(review);
  } catch (err) {
    console.error(err);
    if (err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete review reply (author only)
router.delete('/:id/reviews/:reviewId/reply', authenticate, async (req, res) => {
  try {
    const review = await reviewsModel.deleteReviewReply(req.user.id, req.params.reviewId);
    res.json(review);
  } catch (err) {
    console.error(err);
    if (err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Reply to a comment (author only)
router.post('/:id/comments/:commentId/reply', authenticate, async (req, res) => {
  try {
    const { replyText } = req.body;
    if (!replyText || replyText.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    if (replyText.length > 2000) {
      return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
    }

    const comment = await commentsModel.replyToComment(req.user.id, req.params.commentId, replyText);
    res.json(comment);
  } catch (err) {
    console.error(err);
    if (err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment reply (author only)
router.delete('/:id/comments/:commentId/reply', authenticate, async (req, res) => {
  try {
    const comment = await commentsModel.deleteCommentReply(req.user.id, req.params.commentId);
    res.json(comment);
  } catch (err) {
    console.error(err);
    if (err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Review Replies (Author endpoints)
router.post('/:id/reviews/:reviewId/replies', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    console.log('[POST /books/:id/reviews/:reviewId/replies] Request:', {
      bookId: req.params.id,
      reviewId: req.params.reviewId,
      textLength: text?.length,
      authorId: req.user?.id
    });

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
    }

    // Verify book ownership
    const book = await booksModel.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only reply to reviews on your own books' });
    }

    const reply = await reviewRepliesModel.addReply(
      req.params.reviewId,
      req.user.id,
      'author',
      text
    );

    console.log('[POST /books/:id/reviews/:reviewId/replies] Success:', reply.id);

    // Get the original review to find the reader who wrote it
    const review = await reviewsModel.getReviewById(req.params.reviewId);

    if (review && review.reader_id) {
      const author = await getAuthorById(req.user.id);

      await createNotification({
        recipientId: review.reader_id,
        recipientType: 'reader',
        type: 'comment_reply',
        title: 'Author Replied',
        message: `${author.name} replied to your review of "${book.title}"`,
        bookId: book.id,
        authorId: req.user.id
      });
    }

    res.json(reply);
  } catch (err) {
    console.error('[POST /books/:id/reviews/:reviewId/replies] Error:', err.message);
    console.error('[POST /books/:id/reviews/:reviewId/replies] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/:id/reviews/:reviewId/replies/:replyId', authenticate, async (req, res) => {
  try {
    console.log('[DELETE /books/:id/reviews/:reviewId/replies/:replyId] Request:', {
      replyId: req.params.replyId,
      authorId: req.user?.id
    });

    // Verify book ownership
    const book = await booksModel.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await reviewRepliesModel.deleteReply(
      req.params.replyId,
      req.user.id,
      'author'
    );

    if (!result) {
      console.log('[DELETE /books/:id/reviews/:reviewId/replies/:replyId] Forbidden - not owner');
      return res.status(403).json({ error: 'Cannot delete this reply' });
    }

    console.log('[DELETE /books/:id/reviews/:reviewId/replies/:replyId] Success');
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /books/:id/reviews/:reviewId/replies/:replyId] Error:', err.message);
    console.error('[DELETE /books/:id/reviews/:reviewId/replies/:replyId] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Comment Replies (Author endpoints)
router.post('/:id/comments/:commentId/replies', authenticate, async (req, res) => {
  try {
    const { text } = req.body;

    console.log('[POST /books/:id/comments/:commentId/replies] Request:', {
      bookId: req.params.id,
      commentId: req.params.commentId,
      textLength: text?.length,
      authorId: req.user?.id
    });

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Reply text is required' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
    }

    // Verify book ownership
    const book = await booksModel.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only reply to comments on your own books' });
    }

    const reply = await commentRepliesModel.addReply(
      req.params.commentId,
      req.user.id,
      'author',
      text
    );

    console.log('[POST /books/:id/comments/:commentId/replies] Success:', reply.id);

    // Get the original comment to find the reader who wrote it
    const comment = await commentsModel.getCommentById(req.params.commentId);
    if (comment && comment.reader_id) {
      const author = await getAuthorById(req.user.id);

      await createNotification({
        recipientId: comment.reader_id,
        recipientType: 'reader',
        type: 'comment_reply',
        title: 'Author Replied',
        message: `${author.name} replied to your comment on "${book.title}"`,
        bookId: book.id,
        authorId: req.user.id
      });
    }

    res.json(reply);
  } catch (err) {
    console.error('[POST /books/:id/comments/:commentId/replies] Error:', err.message);
    console.error('[POST /books/:id/comments/:commentId/replies] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

router.delete('/:id/comments/:commentId/replies/:replyId', authenticate, async (req, res) => {
  try {
    console.log('[DELETE /books/:id/comments/:commentId/replies/:replyId] Request:', {
      replyId: req.params.replyId,
      authorId: req.user?.id
    });

    // Verify book ownership
    const book = await booksModel.getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await commentRepliesModel.deleteReply(
      req.params.replyId,
      req.user.id,
      'author'
    );

    if (!result) {
      console.log('[DELETE /books/:id/comments/:commentId/replies/:replyId] Forbidden - not owner');
      return res.status(403).json({ error: 'Cannot delete this reply' });
    }

    console.log('[DELETE /books/:id/comments/:commentId/replies/:replyId] Success');
    res.json({ deleted: true });
  } catch (err) {
    console.error('[DELETE /books/:id/comments/:commentId/replies/:replyId] Error:', err.message);
    console.error('[DELETE /books/:id/comments/:commentId/replies/:replyId] Stack:', err.stack);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
