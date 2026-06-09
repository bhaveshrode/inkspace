import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

// Follows (toggle)
export async function toggleFollow(followerId, authorId) {
  const pool = getPool();
  const existsRes = await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND author_id = $2', [followerId, authorId]);
  if (existsRes.rows.length > 0) {
    await pool.query('DELETE FROM follows WHERE follower_id = $1 AND author_id = $2', [followerId, authorId]);
    await pool.query('UPDATE authors SET followers = followers - 1 WHERE id = $1', [authorId]);
    return false;
  } else {
    await pool.query('INSERT INTO follows (follower_id, author_id) VALUES ($1,$2)', [followerId, authorId]);
    await pool.query('UPDATE authors SET followers = followers + 1 WHERE id = $1', [authorId]);
    return true;
  }
}

// Bookmarks (toggle)
export async function toggleBookmark(userId, bookId, chapterIndex = null) {
  const pool = getPool();
  const existsRes = await pool.query('SELECT id FROM bookmarks WHERE user_id = $1 AND book_id = $2 AND ((chapter_index IS NULL AND $3 IS NULL) OR chapter_index = $3)', [userId, bookId, chapterIndex]);
  if (existsRes.rows.length > 0) {
    await pool.query('DELETE FROM bookmarks WHERE id = $1', [existsRes.rows[0].id]);
    return false;
  } else {
    const id = uuidv4();
    await pool.query('INSERT INTO bookmarks (id, user_id, book_id, chapter_index) VALUES ($1,$2,$3,$4)', [id, userId, bookId, chapterIndex]);
    return true;
  }
}

// Reading
export async function addReading(userId, bookId, chapterIndex = null) {
  const pool = getPool();
  const id = uuidv4();
  await pool.query('INSERT INTO reading_history (id, user_id, book_id, chapter_index) VALUES ($1,$2,$3,$4)', [id, userId, bookId, chapterIndex]);
}

export async function getUserFollowing(followerId) {
  const pool = getPool();
  const res = await pool.query('SELECT author_id FROM follows WHERE follower_id = $1', [followerId]);
  return res.rows.map(r => r.author_id);
}

export async function getUserBookmarks(userId) {
  const pool = getPool();
  const res = await pool.query('SELECT book_id, chapter_index FROM bookmarks WHERE user_id = $1', [userId]);
  return res.rows;
}

export async function getUserReadingHistory(userId) {
  const pool = getPool();
  const res = await pool.query('SELECT book_id, chapter_index, MAX(read_at) as last_read FROM reading_history WHERE user_id = $1 GROUP BY book_id, chapter_index ORDER BY last_read DESC', [userId]);
  return res.rows;
}

