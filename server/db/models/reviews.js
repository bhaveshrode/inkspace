import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

// Get all reviews for a book with reader details
export async function getReviewsByBookId(bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      r.id,
      r.rating,
      r.title,
      r.review_text,
      r.helpful_count,
      r.author_reply,
      r.author_reply_at,
      r.created_at,
      r.updated_at,
      rd.id as reader_id,
      rd.name as reader_name,
      rd.avatar as reader_avatar
    FROM reviews r
    JOIN readers rd ON r.reader_id = rd.id
    WHERE r.book_id = $1
    ORDER BY r.created_at DESC
  `, [bookId]);
  return res.rows;
}

// Get specific reader's review for a book
export async function getReviewByReaderAndBook(readerId, bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      r.id,
      r.rating,
      r.title,
      r.review_text,
      r.helpful_count,
      r.author_reply,
      r.author_reply_at,
      r.created_at,
      r.updated_at,
      rd.id as reader_id,
      rd.name as reader_name,
      rd.avatar as reader_avatar
    FROM reviews r
    JOIN readers rd ON r.reader_id = rd.id
    WHERE r.reader_id = $1 AND r.book_id = $2
  `, [readerId, bookId]);
  return res.rows[0] || null;
}

// Create a new review
export async function createReview(readerId, bookId, { rating, title, reviewText }) {
  const pool = getPool();
  const id = uuidv4();
  const now = new Date();

  await pool.query(`
    INSERT INTO reviews (id, book_id, reader_id, rating, title, review_text, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [id, bookId, readerId, rating, title, reviewText, now, now]);

  // Also update or create the rating
  await pool.query(`
    INSERT INTO ratings (id, reader_id, book_id, rating)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (reader_id, book_id) DO UPDATE SET rating = $4
  `, [uuidv4(), readerId, bookId, rating]);

  return getReviewByReaderAndBook(readerId, bookId);
}

// Update an existing review
export async function updateReview(readerId, bookId, { rating, title, reviewText }) {
  const pool = getPool();
  const now = new Date();

  const res = await pool.query(`
    UPDATE reviews
    SET rating = $1, title = $2, review_text = $3, updated_at = $4
    WHERE reader_id = $5 AND book_id = $6
  `, [rating, title, reviewText, now, readerId, bookId]);

  if (res.rowCount === 0) return null;

  // Also update the rating
  await pool.query(`
    UPDATE ratings SET rating = $1 WHERE reader_id = $2 AND book_id = $3
  `, [rating, readerId, bookId]);

  return getReviewByReaderAndBook(readerId, bookId);
}

// Delete a review
export async function deleteReview(readerId, bookId) {
  const pool = getPool();
  const res = await pool.query(`
    DELETE FROM reviews WHERE reader_id = $1 AND book_id = $2
  `, [readerId, bookId]);
  return res.rowCount > 0;
}

// Get all reviews for an author's books
export async function getReviewsForAuthorBooks(authorId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      r.id,
      r.rating,
      r.title,
      r.review_text,
      r.helpful_count,
      r.author_reply,
      r.author_reply_at,
      r.created_at,
      r.updated_at,
      rd.id as reader_id,
      rd.name as reader_name,
      rd.avatar as reader_avatar,
      b.id as book_id,
      b.title as book_title,
      b.cover as book_cover
    FROM reviews r
    JOIN readers rd ON r.reader_id = rd.id
    JOIN books b ON r.book_id = b.id
    WHERE b.author_id = $1
    ORDER BY r.created_at DESC
  `, [authorId]);
  return res.rows;
}

// Check if a reader has voted helpful on a review
export async function hasVotedHelpful(reviewId, readerId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT 1 FROM review_helpful
    WHERE review_id = $1 AND reader_id = $2
  `, [reviewId, readerId]);
  return res.rows.length > 0;
}

// Increment helpful count for a review (with duplicate vote prevention)
export async function incrementHelpfulCount(reviewId, readerId) {
  const pool = getPool();

  // Check if reader already voted
  const alreadyVoted = await hasVotedHelpful(reviewId, readerId);
  if (alreadyVoted) {
    return { success: false, message: 'Already voted helpful' };
  }

  // Use transaction to ensure atomicity
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Record the vote
    await client.query(`
      INSERT INTO review_helpful (review_id, reader_id)
      VALUES ($1, $2)
    `, [reviewId, readerId]);

    // Increment the count
    const res = await client.query(`
      UPDATE reviews
      SET helpful_count = helpful_count + 1
      WHERE id = $1
      RETURNING helpful_count
    `, [reviewId]);

    await client.query('COMMIT');
    return { success: true, helpful_count: res.rows[0]?.helpful_count || 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Get all review IDs that a reader has voted helpful on for a specific book
export async function getReaderHelpfulVotes(readerId, bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT rh.review_id
    FROM review_helpful rh
    JOIN reviews r ON rh.review_id = r.id
    WHERE rh.reader_id = $1 AND r.book_id = $2
  `, [readerId, bookId]);
  return res.rows.map(row => row.review_id);
}

// Get review statistics for a book
export async function getReviewStatsByBookId(bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      COUNT(*) as total_reviews,
      AVG(rating) as average_rating,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
    FROM reviews
    WHERE book_id = $1
  `, [bookId]);
  return res.rows[0] || { total_reviews: 0, average_rating: 0 };
}

// Reply to a review (author only)
export async function replyToReview(authorId, reviewId, replyText) {
  const pool = getPool();

  // Verify book ownership - get review's book and check author
  const checkRes = await pool.query(`
    SELECT b.author_id
    FROM reviews r
    JOIN books b ON r.book_id = b.id
    WHERE r.id = $1
  `, [reviewId]);

  if (checkRes.rows.length === 0) {
    throw new Error('Review not found');
  }

  if (checkRes.rows[0].author_id !== authorId) {
    throw new Error('Forbidden: You can only reply to reviews on your own books');
  }

  // Update review with author reply
  const now = new Date();
  const res = await pool.query(`
    UPDATE reviews
    SET author_reply = $1, author_reply_at = $2
    WHERE id = $3
    RETURNING *
  `, [replyText, now, reviewId]);

  return res.rows[0] || null;
}

// Delete a review reply (author only)
export async function deleteReviewReply(authorId, reviewId) {
  const pool = getPool();

  // Verify book ownership
  const checkRes = await pool.query(`
    SELECT b.author_id
    FROM reviews r
    JOIN books b ON r.book_id = b.id
    WHERE r.id = $1
  `, [reviewId]);

  if (checkRes.rows.length === 0) {
    throw new Error('Review not found');
  }

  if (checkRes.rows[0].author_id !== authorId) {
    throw new Error('Forbidden: You can only delete replies on your own books');
  }

  // Remove author reply
  const res = await pool.query(`
    UPDATE reviews
    SET author_reply = NULL, author_reply_at = NULL
    WHERE id = $1
    RETURNING *
  `, [reviewId]);

  return res.rows[0] || null;
}
