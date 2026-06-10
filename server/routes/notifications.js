import express from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import * as notifications from '../db/models/notifications.js';

const router = express.Router();

// Dual authentication middleware - supports both author and reader tokens
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Token contains id, email, name
    // We need to determine if this is an author or reader
    // For now, we'll try to infer from the request or attach both possibilities
    req.userInfo = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Helper to determine user type from context
// In practice, we need to check which table the user belongs to
async function getUserType(userId) {
  // Import models to check
  const { getAuthorById } = await import('../db/models/authors.js');
  const { getReaderById } = await import('../db/models/readers.js');

  const author = await getAuthorById(userId);
  if (author) return 'author';

  const reader = await getReaderById(userId);
  if (reader) return 'reader';

  return null;
}

// Get notifications
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userType = await getUserType(req.userInfo.id);
    if (!userType) {
      return res.status(404).json({ error: 'User not found' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const notifs = await notifications.getNotifications(req.userInfo.id, userType, { limit, offset });
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', authenticateUser, async (req, res) => {
  try {
    const userType = await getUserType(req.userInfo.id);
    if (!userType) {
      return res.status(404).json({ error: 'User not found' });
    }

    const count = await notifications.getUnreadCount(req.userInfo.id, userType);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.post('/:id/read', authenticateUser, async (req, res) => {
  try {
    await notifications.markAsRead(req.params.id, req.userInfo.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticateUser, async (req, res) => {
  try {
    const userType = await getUserType(req.userInfo.id);
    if (!userType) {
      return res.status(404).json({ error: 'User not found' });
    }

    await notifications.markAllAsRead(req.userInfo.id, userType);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const deleted = await notifications.deleteNotification(req.params.id, req.userInfo.id);
    res.json({ success: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
