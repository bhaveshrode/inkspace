import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

export async function getAuthors() {
  const pool = getPool();
  const res = await pool.query('SELECT id,name,email,bio,avatar,followers,created_at FROM authors ORDER BY created_at DESC');
  return res.rows;
}

export async function getAuthorById(id) {
  const pool = getPool();
  const res = await pool.query('SELECT id,name,email,bio,avatar,followers,created_at FROM authors WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getAuthorByEmail(email) {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM authors WHERE email = $1', [email]);
  return res.rows[0] || null;
}

export async function createAuthor({ name, email, password, bio = '', avatar = '' }) {
  const pool = getPool();
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  await pool.query('INSERT INTO authors (id,name,email,password_hash,bio,avatar) VALUES ($1,$2,$3,$4,$5,$6)', [id, name, email, hash, bio, avatar]);
  return getAuthorById(id);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}
