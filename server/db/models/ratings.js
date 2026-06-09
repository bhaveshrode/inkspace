import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

export async function getRatingsByBookId(bookId) {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM ratings WHERE book_id = $1', [bookId]);
  return res.rows;
}

export async function getAverageRating(bookId) {
  const pool = getPool();
  const res = await pool.query('SELECT AVG(rating)::numeric(10,2) as average, COUNT(*) as count FROM ratings WHERE book_id = $1', [bookId]);
  if (res.rows.length === 0 || res.rows[0].count === '0') {
    return { average: 0, count: 0 };
  }
  return {
    average: parseFloat(res.rows[0].average),
    count: parseInt(res.rows[0].count, 10)
  };
}

export async function getUserRating(readerId, bookId) {
  const pool = getPool();
  const res = await pool.query('SELECT rating FROM ratings WHERE reader_id = $1 AND book_id = $2', [readerId, bookId]);
  return res.rows[0] ? res.rows[0].rating : null;
}

export async function createOrUpdateRating(readerId, bookId, rating) {
  const pool = getPool();
  const existing = await pool.query('SELECT id FROM ratings WHERE reader_id = $1 AND book_id = $2', [readerId, bookId]);

  if (existing.rows.length > 0) {
    await pool.query('UPDATE ratings SET rating = $1 WHERE reader_id = $2 AND book_id = $3', [rating, readerId, bookId]);
  } else {
    const id = uuidv4();
    await pool.query('INSERT INTO ratings (id, reader_id, book_id, rating) VALUES ($1,$2,$3,$4)', [id, readerId, bookId, rating]);
  }

  return { readerId, bookId, rating };
}

export async function deleteRating(readerId, bookId) {
  const pool = getPool();
  const res = await pool.query('DELETE FROM ratings WHERE reader_id = $1 AND book_id = $2', [readerId, bookId]);
  return res.rowCount > 0;
}

export async function getRatingsWithReaderDetails(bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      r.id,
      r.rating,
      r.created_at,
      rd.id as reader_id,
      rd.name as reader_name,
      rd.avatar as reader_avatar
    FROM ratings r
    JOIN readers rd ON r.reader_id = rd.id
    WHERE r.book_id = $1
    ORDER BY r.created_at DESC
  `, [bookId]);
  return res.rows;
}

export async function getRatingsBreakdownByBookId(bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      rating,
      COUNT(*) as count
    FROM ratings
    WHERE book_id = $1
    GROUP BY rating
    ORDER BY rating DESC
  `, [bookId]);

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  res.rows.forEach(row => {
    breakdown[row.rating] = parseInt(row.count, 10);
  });

  return breakdown;
}

export async function getAuthorStatistics(authorId) {
  const pool = getPool();

  const statsRes = await pool.query(`
    SELECT
      COUNT(DISTINCT r.id) as total_ratings,
      COALESCE(AVG(r.rating)::numeric(10,2), 0) as average_rating,
      SUM(b.views) as total_views
    FROM books b
    LEFT JOIN ratings r ON b.id = r.book_id
    WHERE b.author_id = $1
  `, [authorId]);

  const stats = statsRes.rows[0];

  return {
    totalRatings: parseInt(stats.total_ratings, 10) || 0,
    averageRating: parseFloat(stats.average_rating) || 0,
    totalViews: parseInt(stats.total_views, 10) || 0
  };
}
