import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

export async function getBooks() {
  const pool = getPool();
  const res = await pool.query('SELECT id, author_id, title, genre, series, tags, cover, description, status, views, created_at FROM books ORDER BY created_at DESC');
  return res.rows.map(b => ({ ...b, tags: b.tags ? JSON.parse(b.tags) : [] }));
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
  const res = await pool.query('SELECT user_name as user, text, created_at as date FROM comments WHERE book_id = $1 ORDER BY created_at ASC', [bookId]);
  return res.rows;
}

export async function addComment(bookId, { user, text }) {
  const pool = getPool();
  const id = uuidv4();
  await pool.query('INSERT INTO comments (id, book_id, user_name, text) VALUES ($1,$2,$3,$4)', [id, bookId, user || 'Guest', text]);
  return { id, user: user || 'Guest', text, date: new Date().toISOString() };
}

