import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getPool } from '../index.js';

export async function getReaders() {
  const pool = getPool();
  const res = await pool.query('SELECT id,name,email,bio,avatar,created_at FROM readers ORDER BY created_at DESC');
  return res.rows;
}

export async function getReaderById(id) {
  const pool = getPool();
  const res = await pool.query('SELECT id,name,email,bio,avatar,created_at FROM readers WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function getReaderByEmail(email) {
  const pool = getPool();
  const res = await pool.query('SELECT * FROM readers WHERE email = $1', [email]);
  return res.rows[0] || null;
}

export async function createReader({ name, email, password, bio = '', avatar = '' }) {
  const pool = getPool();
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  await pool.query('INSERT INTO readers (id,name,email,password_hash,bio,avatar) VALUES ($1,$2,$3,$4,$5,$6)', [id, name, email, hash, bio, avatar]);
  return getReaderById(id);
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Password Reset Functions
export async function createPasswordResetToken(email) {
  const pool = getPool();
  const reader = await getReaderByEmail(email);
  if (!reader) return null;

  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenId = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  // Delete any existing unused tokens for this user
  await pool.query(
    'DELETE FROM password_reset_tokens WHERE user_id = $1 AND user_type = $2 AND used = false',
    [reader.id, 'reader']
  );

  // Insert new token
  await pool.query(
    'INSERT INTO password_reset_tokens (id, user_id, user_type, token, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [tokenId, reader.id, 'reader', token, expiresAt]
  );

  return { token, email: reader.email, name: reader.name };
}

export async function validatePasswordResetToken(token) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token = $1 AND user_type = $2 AND used = false AND expires_at > NOW()`,
    [token, 'reader']
  );

  return res.rows[0] || null;
}

export async function resetPassword(token, newPassword) {
  const pool = getPool();

  // Validate token
  const resetToken = await validatePasswordResetToken(token);
  if (!resetToken) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const hash = bcrypt.hashSync(newPassword, 10);

  // Update reader's password
  await pool.query(
    'UPDATE readers SET password_hash = $1 WHERE id = $2',
    [hash, resetToken.user_id]
  );

  // Mark token as used
  await pool.query(
    'UPDATE password_reset_tokens SET used = true WHERE id = $1',
    [resetToken.id]
  );

  return true;
}
