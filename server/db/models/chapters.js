import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

export async function createChapter(bookId, { title, content }) {
  const pool = getPool();
  const bookRes = await pool.query('SELECT id FROM books WHERE id = $1', [bookId]);
  if (bookRes.rows.length === 0) return null;
  const idxRes = await pool.query('SELECT COALESCE(MAX(idx), -1) as m FROM chapters WHERE book_id = $1', [bookId]);
  const idx = parseInt(idxRes.rows[0].m, 10) + 1;
  const id = uuidv4();
  await pool.query('INSERT INTO chapters (id, book_id, idx, title, content) VALUES ($1,$2,$3,$4,$5)', [id, bookId, idx, title, content]);
  return { id, bookId, idx, title, content };
}

export async function updateChapter(bookId, idx, { title, content }) {
  const pool = getPool();
  const rowRes = await pool.query('SELECT id FROM chapters WHERE book_id = $1 AND idx = $2', [bookId, idx]);
  if (rowRes.rows.length === 0) return false;
  await pool.query('UPDATE chapters SET title=$1, content=$2 WHERE book_id=$3 AND idx=$4', [title, content, bookId, idx]);
  return true;
}

export async function deleteChapter(bookId, idx) {
  const pool = getPool();
  const delRes = await pool.query('DELETE FROM chapters WHERE book_id = $1 AND idx = $2', [bookId, idx]);
  if (delRes.rowCount > 0) {
    const rows = await pool.query('SELECT id, idx FROM chapters WHERE book_id = $1 AND idx > $2 ORDER BY idx ASC', [bookId, idx]);
    for (const r of rows.rows) {
      await pool.query('UPDATE chapters SET idx = $1 WHERE id = $2', [r.idx - 1, r.id]);
    }
    return true;
  }
  return false;
}

