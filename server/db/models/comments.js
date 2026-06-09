import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

// Get all comments for a book
export async function getCommentsByBookId(bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      c.id,
      c.text,
      c.author_reply,
      c.author_reply_at,
      c.created_at as date,
      COALESCE(r.name, c.user_name, 'Guest') as user,
      r.id as reader_id,
      r.avatar as avatar
    FROM comments c
    LEFT JOIN readers r ON c.reader_id = r.id
    WHERE c.book_id = $1
    ORDER BY c.created_at ASC
  `, [bookId]);
  return res.rows;
}

// Add a comment to a book
export async function addComment(bookId, { readerId = null, user = null, text }) {
  const pool = getPool();
  const id = uuidv4();

  if (readerId) {
    await pool.query(
      'INSERT INTO comments (id, book_id, reader_id, text) VALUES ($1, $2, $3, $4)',
      [id, bookId, readerId, text]
    );
  } else {
    await pool.query(
      'INSERT INTO comments (id, book_id, user_name, text) VALUES ($1, $2, $3, $4)',
      [id, bookId, user || 'Guest', text]
    );
  }

  const result = await pool.query(`
    SELECT
      c.id,
      c.text,
      c.created_at as date,
      COALESCE(r.name, c.user_name, 'Guest') as user,
      r.id as reader_id,
      r.avatar as avatar
    FROM comments c
    LEFT JOIN readers r ON c.reader_id = r.id
    WHERE c.id = $1
  `, [id]);
  return result.rows[0];
}

// Delete a comment (only if user is the owner)
export async function deleteComment(commentId, userId) {
  const pool = getPool();

  // Check if comment exists and belongs to user
  const checkRes = await pool.query(
    'SELECT reader_id FROM comments WHERE id = $1',
    [commentId]
  );

  if (checkRes.rows.length === 0) return false;
  if (checkRes.rows[0].reader_id !== userId) return false;

  const res = await pool.query(
    'DELETE FROM comments WHERE id = $1 AND reader_id = $2',
    [commentId, userId]
  );
  return res.rowCount > 0;
}

// Get all comments for an author's books
export async function getCommentsForAuthorBooks(authorId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      c.id,
      c.text,
      c.author_reply,
      c.author_reply_at,
      c.created_at as date,
      COALESCE(r.name, c.user_name, 'Guest') as user,
      r.id as reader_id,
      r.avatar as avatar,
      b.id as book_id,
      b.title as book_title,
      b.cover as book_cover
    FROM comments c
    LEFT JOIN readers r ON c.reader_id = r.id
    JOIN books b ON c.book_id = b.id
    WHERE b.author_id = $1
    ORDER BY c.created_at DESC
  `, [authorId]);
  return res.rows;
}

// Get comment count for a book
export async function getCommentCountByBookId(bookId) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT COUNT(*) as count FROM comments WHERE book_id = $1',
    [bookId]
  );
  return parseInt(res.rows[0].count, 10);
}

// Reply to a comment (author only)
export async function replyToComment(authorId, commentId, replyText) {
  const pool = getPool();

  // Verify book ownership - get comment's book and check author
  const checkRes = await pool.query(`
    SELECT b.author_id
    FROM comments c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = $1
  `, [commentId]);

  if (checkRes.rows.length === 0) {
    throw new Error('Comment not found');
  }

  if (checkRes.rows[0].author_id !== authorId) {
    throw new Error('Forbidden: You can only reply to comments on your own books');
  }

  // Update comment with author reply
  const now = new Date();
  const res = await pool.query(`
    UPDATE comments
    SET author_reply = $1, author_reply_at = $2
    WHERE id = $3
    RETURNING *
  `, [replyText, now, commentId]);

  return res.rows[0] || null;
}

// Delete a comment reply (author only)
export async function deleteCommentReply(authorId, commentId) {
  const pool = getPool();

  // Verify book ownership
  const checkRes = await pool.query(`
    SELECT b.author_id
    FROM comments c
    JOIN books b ON c.book_id = b.id
    WHERE c.id = $1
  `, [commentId]);

  if (checkRes.rows.length === 0) {
    throw new Error('Comment not found');
  }

  if (checkRes.rows[0].author_id !== authorId) {
    throw new Error('Forbidden: You can only delete replies on your own books');
  }

  // Remove author reply
  const res = await pool.query(`
    UPDATE comments
    SET author_reply = NULL, author_reply_at = NULL
    WHERE id = $1
    RETURNING *
  `, [commentId]);

  return res.rows[0] || null;
}
