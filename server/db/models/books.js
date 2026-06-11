import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

export async function getBooks(options = {}) {
  const pool = getPool();
  let query = 'SELECT id, author_id, title, genre, series, tags, cover, description, status, views, created_at FROM books WHERE 1=1';
  const params = [];
  let paramCount = 0;

  // Apply filters
  if (options.status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(options.status);
  }

  // Apply sorting
  if (options.sortBy === 'views') {
    query += ' ORDER BY views DESC';
  } else if (options.sortBy === 'rating') {
    // Note: This requires a JOIN with ratings, for now just sort by created_at
    query += ' ORDER BY created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  // Apply limit
  if (options.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(options.limit));
  }

  const res = await pool.query(query, params);
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [] }));
}

// Discovery: Trending books (most views in recent days)
export async function getTrendingBooks(days = 7, limit = 20) {
  const pool = getPool();
  // For trending, we'll use view count as a proxy
  // In a real implementation, you'd track views with timestamps
  const res = await pool.query(`
    SELECT b.id, b.author_id, b.title, b.genre, b.series, b.tags, b.cover, b.description, b.status, b.views, b.created_at,
           COALESCE(AVG(r.rating), 0) as average_rating,
           COUNT(DISTINCT r.id) as rating_count
    FROM books b
    LEFT JOIN ratings r ON b.id = r.book_id
    WHERE b.status = 'published'
    GROUP BY b.id
    ORDER BY b.views DESC, b.created_at DESC
    LIMIT $1
  `, [limit]);
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [], averageRating: parseFloat(b.average_rating) || 0, ratingCount: parseInt(b.rating_count) || 0 }));
}

// Discovery: Highest rated books (avg >= 4.0, min 3 ratings)
export async function getHighestRatedBooks(limit = 20) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT b.id, b.author_id, b.title, b.genre, b.series, b.tags, b.cover, b.description, b.status, b.views, b.created_at,
           AVG(r.rating) as average_rating,
           COUNT(r.id) as rating_count
    FROM books b
    INNER JOIN ratings r ON b.id = r.book_id
    WHERE b.status = 'published'
    GROUP BY b.id
    HAVING COUNT(r.id) >= 3 AND AVG(r.rating) >= 4.0
    ORDER BY AVG(r.rating) DESC, COUNT(r.id) DESC
    LIMIT $1
  `, [limit]);
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [], averageRating: parseFloat(b.average_rating) || 0, ratingCount: parseInt(b.rating_count) || 0 }));
}

// Discovery: Recently updated books (new chapters in last N days)
export async function getRecentlyUpdatedBooks(days = 30, limit = 20) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT DISTINCT b.id, b.author_id, b.title, b.genre, b.series, b.tags, b.cover, b.description, b.status, b.views, b.created_at,
           MAX(c.created_at) as last_chapter_date,
           COALESCE(AVG(r.rating), 0) as average_rating,
           COUNT(DISTINCT r.id) as rating_count
    FROM books b
    INNER JOIN chapters c ON b.id = c.book_id
    LEFT JOIN ratings r ON b.id = r.book_id
    WHERE b.status = 'published'
      AND c.created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY b.id
    ORDER BY MAX(c.created_at) DESC
    LIMIT $1
  `, [limit]);
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [], averageRating: parseFloat(b.average_rating) || 0, ratingCount: parseInt(b.rating_count) || 0, lastUpdated: b.last_chapter_date }));
}

// Discovery: Completed books
export async function getCompletedBooks(limit = 20) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT b.id, b.author_id, b.title, b.genre, b.series, b.tags, b.cover, b.description, b.status, b.views, b.created_at,
           COALESCE(AVG(r.rating), 0) as average_rating,
           COUNT(DISTINCT r.id) as rating_count
    FROM books b
    LEFT JOIN ratings r ON b.id = r.book_id
    WHERE b.status = 'completed'
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT $1
  `, [limit]);
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [], averageRating: parseFloat(b.average_rating) || 0, ratingCount: parseInt(b.rating_count) || 0 }));
}

export async function createBook({ authorId, title, genre = '', series = '', tags = [], cover = '', description = '', status = 'published' }) {
  const pool = getPool();
  const id = uuidv4();
  await pool.query('INSERT INTO books (id, author_id, title, genre, series, tags, cover, description, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [id, authorId, title, genre, series, JSON.stringify(tags), cover, description, status]);
  return getBookById(id);
}

export async function getBookById(id) {
  const pool = getPool();
  const res = await pool.query('SELECT id, author_id, title, genre, series, tags, cover, description, status, views, created_at FROM books WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const b = res.rows[0];
  const chRes = await pool.query('SELECT idx,title,content,created_at FROM chapters WHERE book_id = $1 ORDER BY idx ASC', [id]);
  return { ...b, tags: b.tags ? JSON.parse(b.tags) : [], chapters: chRes.rows };
}

export async function updateBook(id, fields) {
  const pool = getPool();
  const bookRes = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
  if (bookRes.rows.length === 0) return null;
  const book = bookRes.rows[0];
  const updated = { ...book, ...fields };
  if (fields.tags && Array.isArray(fields.tags)) updated.tags = JSON.stringify(fields.tags);
  await pool.query('UPDATE books SET title=$1, genre=$2, series=$3, tags=$4, cover=$5, description=$6, status=$7 WHERE id=$8', [updated.title, updated.genre, updated.series, updated.tags || book.tags, updated.cover, updated.description, updated.status, id]);
  return getBookById(id);
}

export async function deleteBook(id) {
  const pool = getPool();
  const res = await pool.query('DELETE FROM books WHERE id = $1', [id]);
  return res.rowCount > 0;
}

export async function getComments(bookId) {
  const pool = getPool();
  const res = await pool.query(`
    SELECT c.id, c.text, c.created_at as date,
           COALESCE(r.name, c.user_name, 'Guest') as user,
           r.avatar as avatar
    FROM comments c
    LEFT JOIN readers r ON c.reader_id = r.id
    WHERE c.book_id = $1
    ORDER BY c.created_at ASC
  `, [bookId]);
  return res.rows;
}

export async function addComment(bookId, { readerId = null, user = null, text }) {
  const pool = getPool();
  const id = uuidv4();
  if (readerId) {
    await pool.query('INSERT INTO comments (id, book_id, reader_id, text) VALUES ($1,$2,$3,$4)', [id, bookId, readerId, text]);
  } else {
    await pool.query('INSERT INTO comments (id, book_id, user_name, text) VALUES ($1,$2,$3,$4)', [id, bookId, user || 'Guest', text]);
  }

  const result = await pool.query(`
    SELECT c.id, c.text, c.created_at as date,
           COALESCE(r.name, c.user_name, 'Guest') as user,
           r.avatar as avatar
    FROM comments c
    LEFT JOIN readers r ON c.reader_id = r.id
    WHERE c.id = $1
  `, [id]);
  return result.rows[0];
}

// Search: Full-text search for books with filters and sorting
export async function searchBooks(searchOptions = {}) {
  const pool = getPool();
  const {
    query = '',
    genre = '',
    status = '',
    minRating = 0,
    sortBy = 'relevance', // relevance, rating, views, newest
    limit = 50,
    offset = 0
  } = searchOptions;

  let sqlQuery = `
    SELECT DISTINCT b.id, b.author_id, b.title, b.genre, b.series, b.tags, b.cover, b.description, b.status, b.views, b.created_at,
           COALESCE(AVG(r.rating), 0) as average_rating,
           COUNT(DISTINCT r.id) as rating_count,
           a.name as author_name
    FROM books b
    LEFT JOIN ratings r ON b.id = r.book_id
    LEFT JOIN authors a ON b.author_id = a.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  // Full-text search on title, description, genre, series, and tags
  if (query && query.trim()) {
    paramCount++;
    const searchTerm = `%${query.trim().toLowerCase()}%`;
    sqlQuery += ` AND (
      LOWER(b.title) LIKE $${paramCount} OR
      LOWER(b.description) LIKE $${paramCount} OR
      LOWER(b.genre) LIKE $${paramCount} OR
      LOWER(b.series) LIKE $${paramCount} OR
      LOWER(b.tags) LIKE $${paramCount}
    )`;
    params.push(searchTerm);
  }

  // Filter by genre
  if (genre && genre.trim()) {
    paramCount++;
    sqlQuery += ` AND LOWER(b.genre) = $${paramCount}`;
    params.push(genre.trim().toLowerCase());
  }

  // Filter by status
  if (status && status.trim()) {
    paramCount++;
    sqlQuery += ` AND b.status = $${paramCount}`;
    params.push(status.trim());
  }

  sqlQuery += ' GROUP BY b.id, a.name';

  // Filter by minimum rating (after grouping)
  if (minRating > 0) {
    sqlQuery += ` HAVING AVG(r.rating) >= ${minRating}`;
  }

  // Apply sorting
  switch (sortBy) {
    case 'rating':
      sqlQuery += ' ORDER BY AVG(r.rating) DESC NULLS LAST, b.views DESC';
      break;
    case 'views':
      sqlQuery += ' ORDER BY b.views DESC';
      break;
    case 'newest':
      sqlQuery += ' ORDER BY b.created_at DESC';
      break;
    case 'relevance':
    default:
      // For relevance, prioritize exact title matches, then views
      if (query && query.trim()) {
        sqlQuery += ` ORDER BY
          CASE WHEN LOWER(b.title) = '${query.trim().toLowerCase()}' THEN 1 ELSE 2 END,
          b.views DESC
        `;
      } else {
        sqlQuery += ' ORDER BY b.views DESC';
      }
      break;
  }

  // Apply pagination
  paramCount++;
  sqlQuery += ` LIMIT $${paramCount}`;
  params.push(parseInt(limit));

  paramCount++;
  sqlQuery += ` OFFSET $${paramCount}`;
  params.push(parseInt(offset));

  const res = await pool.query(sqlQuery, params);
  return res.rows.map(b => ({
    ...b,
    tags: b.tags ? JSON.parse(b.tags) : [],
    averageRating: parseFloat(b.average_rating) || 0,
    ratingCount: parseInt(b.rating_count) || 0
  }));
}

// Search: Get total count for search results (for pagination)
export async function getSearchCount(searchOptions = {}) {
  const pool = getPool();
  const {
    query = '',
    genre = '',
    status = '',
    minRating = 0
  } = searchOptions;

  let sqlQuery = `
    SELECT COUNT(DISTINCT b.id) as total
    FROM books b
    LEFT JOIN ratings r ON b.id = r.book_id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  // Full-text search on title, description, genre, series, and tags
  if (query && query.trim()) {
    paramCount++;
    const searchTerm = `%${query.trim().toLowerCase()}%`;
    sqlQuery += ` AND (
      LOWER(b.title) LIKE $${paramCount} OR
      LOWER(b.description) LIKE $${paramCount} OR
      LOWER(b.genre) LIKE $${paramCount} OR
      LOWER(b.series) LIKE $${paramCount} OR
      LOWER(b.tags) LIKE $${paramCount}
    )`;
    params.push(searchTerm);
  }

  // Filter by genre
  if (genre && genre.trim()) {
    paramCount++;
    sqlQuery += ` AND LOWER(b.genre) = $${paramCount}`;
    params.push(genre.trim().toLowerCase());
  }

  // Filter by status
  if (status && status.trim()) {
    paramCount++;
    sqlQuery += ` AND b.status = $${paramCount}`;
    params.push(status.trim());
  }

  if (minRating > 0) {
    sqlQuery += ' GROUP BY b.id HAVING AVG(r.rating) >= ' + minRating;
  }

  const res = await pool.query(sqlQuery, params);
  return minRating > 0 ? res.rows.length : parseInt(res.rows[0]?.total || 0);
}

