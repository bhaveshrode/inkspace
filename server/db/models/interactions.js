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
  // Split into two queries to avoid parameter type ambiguity
  let existsRes;
  if (chapterIndex === null) {
    existsRes = await pool.query('SELECT id FROM bookmarks WHERE user_id = $1 AND book_id = $2 AND chapter_index IS NULL', [userId, bookId]);
  } else {
    existsRes = await pool.query('SELECT id FROM bookmarks WHERE user_id = $1 AND book_id = $2 AND chapter_index = $3', [userId, bookId, chapterIndex]);
  }

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

export async function getBookmarksWithDetails(userId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT b.id, b.author_id, b.title, b.genre, b.series, b.tags, b.cover, b.description, b.status, b.views, b.created_at,
           bm.chapter_index, bm.created_at as bookmarked_at,
           a.name as author_name
    FROM bookmarks bm
    JOIN books b ON bm.book_id = b.id
    JOIN authors a ON b.author_id = a.id
    WHERE bm.user_id = $1
    ORDER BY bm.created_at DESC
  `, [userId]);
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [] }));
}

export async function getReadingHistoryWithDetails(userId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT DISTINCT ON (rh.book_id)
           b.id, b.author_id, b.title, b.genre, b.series, b.tags, b.cover, b.description, b.status, b.views, b.created_at,
           rh.chapter_index, rh.read_at as last_read,
           a.name as author_name
    FROM reading_history rh
    JOIN books b ON rh.book_id = b.id
    JOIN authors a ON b.author_id = a.id
    WHERE rh.user_id = $1
    ORDER BY rh.book_id, rh.read_at DESC
  `, [userId]);
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [] }));
}

export async function getFollowedAuthorsWithDetails(followerId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT a.id, a.name, a.email, a.bio, a.avatar, a.followers, a.created_at,
           f.created_at as followed_at
    FROM follows f
    JOIN authors a ON f.author_id = a.id
    WHERE f.follower_id = $1
    ORDER BY f.created_at DESC
  `, [followerId]);
  return res.rows;
}

export async function getAuthorFollowerCount(authorId) {
  const pool = getPool();
  const res = await pool.query('SELECT COUNT(*) as count FROM follows WHERE author_id = $1', [authorId]);
  return parseInt(res.rows[0].count, 10);
}

export async function isFollowing(followerId, authorId) {
  const pool = getPool();
  const res = await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND author_id = $2', [followerId, authorId]);
  return res.rows.length > 0;
}

export async function hasBookmark(userId, bookId) {
  const pool = getPool();
  const res = await pool.query('SELECT chapter_index FROM bookmarks WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
  return res.rows[0] || null;
}

export async function getAuthorFollowers(authorId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT r.id, r.name, r.email, r.avatar
    FROM follows f
    JOIN readers r ON f.follower_id = r.id
    WHERE f.author_id = $1
  `, [authorId]);
  return res.rows;
}

