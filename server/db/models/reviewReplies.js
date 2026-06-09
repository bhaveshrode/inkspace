import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

// Get all replies for a review with user details
export async function getRepliesByReviewId(reviewId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      rr.id,
      rr.review_id,
      rr.user_id,
      rr.user_type,
      rr.text,
      rr.created_at,
      CASE
        WHEN rr.user_type = 'author' THEN a.name
        WHEN rr.user_type = 'reader' THEN r.name
        ELSE 'Unknown'
      END as user_name,
      CASE
        WHEN rr.user_type = 'author' THEN a.avatar
        WHEN rr.user_type = 'reader' THEN r.avatar
        ELSE NULL
      END as user_avatar
    FROM review_replies rr
    LEFT JOIN authors a ON rr.user_type = 'author' AND rr.user_id = a.id
    LEFT JOIN readers r ON rr.user_type = 'reader' AND rr.user_id = r.id
    WHERE rr.review_id = $1
    ORDER BY rr.created_at ASC
  `, [reviewId]);
  return res.rows;
}

// Get a single reply by ID
export async function getReplyById(replyId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      rr.id,
      rr.review_id,
      rr.user_id,
      rr.user_type,
      rr.text,
      rr.created_at,
      CASE
        WHEN rr.user_type = 'author' THEN a.name
        WHEN rr.user_type = 'reader' THEN r.name
        ELSE 'Unknown'
      END as user_name,
      CASE
        WHEN rr.user_type = 'author' THEN a.avatar
        WHEN rr.user_type = 'reader' THEN r.avatar
        ELSE NULL
      END as user_avatar
    FROM review_replies rr
    LEFT JOIN authors a ON rr.user_type = 'author' AND rr.user_id = a.id
    LEFT JOIN readers r ON rr.user_type = 'reader' AND rr.user_id = r.id
    WHERE rr.id = $1
  `, [replyId]);
  return res.rows[0] || null;
}

// Add a reply (author or reader)
export async function addReply(reviewId, userId, userType, text) {
  const pool = getPool();
  const id = uuidv4();

  await pool.query(`
    INSERT INTO review_replies (id, review_id, user_id, user_type, text)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, reviewId, userId, userType, text]);

  return getReplyById(id);
}

// Delete a reply (only if user owns it)
export async function deleteReply(replyId, userId, userType) {
  const pool = getPool();

  // Check if reply exists and belongs to user
  const checkRes = await pool.query(
    'SELECT user_id, user_type FROM review_replies WHERE id = $1',
    [replyId]
  );

  if (checkRes.rows.length === 0) return false;
  if (checkRes.rows[0].user_id !== userId || checkRes.rows[0].user_type !== userType) {
    return false;
  }

  const res = await pool.query(
    'DELETE FROM review_replies WHERE id = $1',
    [replyId]
  );
  return res.rowCount > 0;
}
