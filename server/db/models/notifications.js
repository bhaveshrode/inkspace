import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../index.js';

// Create a notification
export async function createNotification({ recipientId, recipientType, type, title, message, bookId = null, chapterId = null, authorId = null, readerId = null }) {
  const pool = getPool();
  const id = uuidv4();
  await pool.query(
    `INSERT INTO notifications (id, recipient_id, recipient_type, type, title, message, book_id, chapter_id, author_id, reader_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, recipientId, recipientType, type, title, message, bookId, chapterId, authorId, readerId]
  );
  return id;
}

// Get notifications for a user (paginated)
export async function getNotifications(recipientId, recipientType, { limit = 20, offset = 0 }) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT * FROM notifications
     WHERE recipient_id = $1 AND recipient_type = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [recipientId, recipientType, limit, offset]
  );
  return res.rows;
}

// Get unread count
export async function getUnreadCount(recipientId, recipientType) {
  const pool = getPool();
  const res = await pool.query(
    `SELECT COUNT(*) as count FROM notifications
     WHERE recipient_id = $1 AND recipient_type = $2 AND read = false`,
    [recipientId, recipientType]
  );
  return parseInt(res.rows[0].count, 10);
}

// Mark notification as read
export async function markAsRead(notificationId, recipientId) {
  const pool = getPool();
  await pool.query(
    `UPDATE notifications SET read = true
     WHERE id = $1 AND recipient_id = $2`,
    [notificationId, recipientId]
  );
}

// Mark all as read
export async function markAllAsRead(recipientId, recipientType) {
  const pool = getPool();
  await pool.query(
    `UPDATE notifications SET read = true
     WHERE recipient_id = $1 AND recipient_type = $2 AND read = false`,
    [recipientId, recipientType]
  );
}

// Delete notification
export async function deleteNotification(notificationId, recipientId) {
  const pool = getPool();
  const res = await pool.query(
    `DELETE FROM notifications WHERE id = $1 AND recipient_id = $2`,
    [notificationId, recipientId]
  );
  return res.rowCount > 0;
}
