import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

// Get all replies for a comment with user details
export async function getRepliesByCommentId(commentId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      cr.id,
      cr.comment_id,
      cr.user_id,
      cr.user_type,
      cr.text,
      cr.created_at,
      CASE
        WHEN cr.user_type = 'author' THEN a.name
        WHEN cr.user_type = 'reader' THEN r.name
        ELSE 'Unknown'
      END as user_name,
      CASE
        WHEN cr.user_type = 'author' THEN a.avatar
        WHEN cr.user_type = 'reader' THEN r.avatar
        ELSE NULL
      END as user_avatar
    FROM comment_replies cr
    LEFT JOIN authors a ON cr.user_type = 'author' AND cr.user_id = a.id
    LEFT JOIN readers r ON cr.user_type = 'reader' AND cr.user_id = r.id
    WHERE cr.comment_id = $1
    ORDER BY cr.created_at ASC
  `, [commentId]);
  return res.rows;
}

// Get a single reply by ID
export async function getReplyById(replyId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      cr.id,
      cr.comment_id,
      cr.user_id,
      cr.user_type,
      cr.text,
      cr.created_at,
      CASE
        WHEN cr.user_type = 'author' THEN a.name
        WHEN cr.user_type = 'reader' THEN r.name
        ELSE 'Unknown'
      END as user_name,
      CASE
        WHEN cr.user_type = 'author' THEN a.avatar
        WHEN cr.user_type = 'reader' THEN r.avatar
        ELSE NULL
      END as user_avatar
    FROM comment_replies cr
    LEFT JOIN authors a ON cr.user_type = 'author' AND cr.user_id = a.id
    LEFT JOIN readers r ON cr.user_type = 'reader' AND cr.user_id = r.id
    WHERE cr.id = $1
  `, [replyId]);
  return res.rows[0] || null;
}

// Add a reply (author or reader)
export async function addReply(commentId, userId, userType, text) {
  const pool = getPool();
  const id = uuidv4();

  await pool.query(`
    INSERT INTO comment_replies (id, comment_id, user_id, user_type, text)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, commentId, userId, userType, text]);

  return getReplyById(id);
}

// Delete a reply (only if user owns it)
export async function deleteReply(replyId, userId, userType) {
  const pool = getPool();

  // Check if reply exists and belongs to user
  const checkRes = await pool.query(
    'SELECT user_id, user_type FROM comment_replies WHERE id = $1',
    [replyId]
  );

  if (checkRes.rows.length === 0) return false;
  if (checkRes.rows[0].user_id !== userId || checkRes.rows[0].user_type !== userType) {
    return false;
  }

  const res = await pool.query(
    'DELETE FROM comment_replies WHERE id = $1',
    [replyId]
  );
  return res.rowCount > 0;
}
